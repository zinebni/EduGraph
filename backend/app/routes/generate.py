import json
import uuid
import asyncio
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db, async_session
from app.models import Settings, Generation
from app.agents.graph import build_graph

router = APIRouter(prefix="/ws", tags=["generate"])

def extract_messages_from_val(val):
    """Recursively collect message lists in any dictionary or list structure."""
    messages = []
    if isinstance(val, list):
        if val and hasattr(val[0], "content"):
            messages.extend(val)
        else:
            for item in val:
                messages.extend(extract_messages_from_val(item))
    elif isinstance(val, dict):
        if "messages" in val:
            messages.extend(val["messages"])
        for key, v in val.items():
            if key == "messages":
                continue
            messages.extend(extract_messages_from_val(v))
    return messages

def is_handoff_message(content: str) -> bool:
    """Return True for LangGraph supervisor transfer/status messages."""
    handoff_markers = [
        "Successfully transferred to",
        "Transferring back to",
        "transfer_to_",
    ]
    return any(marker in content for marker in handoff_markers)

def strip_json_fence(content: str) -> str:
    cleaned = content.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    return cleaned.strip()

def message_content_to_text(content) -> str:
    """Normalize LangChain string or structured content blocks to plain text."""
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict):
                text = block.get("text")
                if isinstance(text, str):
                    parts.append(text)
        return "\n".join(parts).strip()
    if isinstance(content, dict):
        text = content.get("text")
        if isinstance(text, str):
            return text.strip()
    return ""

@router.websocket("/generate")
async def generate_curriculum(websocket: WebSocket):
    await websocket.accept()
    
    gen_id = None
    try:
        # 1. Receive input data
        data_str = await websocket.receive_text()
        input_params = json.loads(data_str)
        
        mode = input_params.get("mode") # "modernize" or "generate"
        
        # 2. Get API keys from db
        async with async_session() as db:
            result = await db.execute(select(Settings))
            settings = result.scalar_one_or_none()
            
            if not settings or not settings.google_api_key or not settings.tavily_api_key:
                await websocket.send_json({
                    "type": "error",
                    "message": "API keys are not configured. Please go to Settings to configure them."
                })
                await websocket.close()
                return
                
            google_key = settings.google_api_key
            tavily_key = settings.tavily_api_key
            model_name = settings.default_model or "gemini-3.1-flash-lite"
            
        # 3. Create Generation record in SQLite
        gen_id = str(uuid.uuid4())
        
        # Determine title
        if mode == "modernize":
            syllabus_data = input_params.get("syllabus", {})
            title = f"Modernized: {syllabus_data.get('program_name', 'Untitled')}"
            user_query = input_params.get("query", "")
            input_data = json.dumps({"syllabus": syllabus_data, "query": user_query})
            prompt_content = f"Modernize this syllabus:\n{json.dumps(syllabus_data, indent=2)}\n\nAdditional instructions: {user_query}"
        else:
            topic = input_params.get("topic", "Untitled")
            title = f"Generated: {topic}"
            target_audience = input_params.get("target_audience", "")
            level = input_params.get("level", "Beginner")
            hours = input_params.get("total_hours", 60)
            user_query = input_params.get("query", "")
            input_data = json.dumps({
                "topic": topic,
                "target_audience": target_audience,
                "level": level,
                "total_hours": hours,
                "query": user_query
            })
            prompt_content = f"Generate a new curriculum from scratch. Topic: {topic}. Target Audience: {target_audience}. Level: {level}. Total Hours: {hours}. Additional instructions: {user_query}"
            
        async with async_session() as db:
            generation = Generation(
                id=gen_id,
                title=title,
                mode=mode,
                input_data=input_data,
                status="processing"
            )
            db.add(generation)
            await db.commit()
            
        # Build the graph dynamically
        graph = build_graph(google_key, tavily_key, model_name)
        
        # 4. Stream and execute graph
        # Initialize state with the initial prompt message
        inputs = {"messages": [("user", prompt_content)]}
        
        # Keep track of results
        syllabus_summary = ""
        search_results = ""
        curriculum_report = ""
        quizzes_data = ""
        
        # We stream state updates and collect all messages as safety fallback
        all_messages = []
        async for chunk in graph.astream(inputs, stream_mode="updates"):
            for key, val in chunk.items():
                # Extract messages from this step update (collect all, including parent supervisor!)
                chunk_msgs = extract_messages_from_val(val)
                if chunk_msgs:
                    all_messages.extend(chunk_msgs)
                    
                    # Track agent transitions and results from supervisor tool calls & responses
                    for msg in chunk_msgs:
                        content = message_content_to_text(getattr(msg, "content", ""))
                        
                        # 1. Start Signal (Supervisor tool calls to delegate tasks)
                        if hasattr(msg, "tool_calls") and msg.tool_calls:
                            for tc in msg.tool_calls:
                                tool_name = tc.get("name", "")
                                for target_agent in ["syllabus_reader_agent", "search_agent", "curriculum_writer_agent", "quiz_exercise_agent"]:
                                    if target_agent in tool_name:
                                        await websocket.send_json({
                                            "type": "agent_start",
                                            "agent": target_agent,
                                            "message": f"{target_agent} has started..."
                                        })
                                        
                        # 2. Result Signal (Tool response messages returning content)
                        elif msg.__class__.__name__ == "ToolMessage" or getattr(msg, "type", "") == "tool":
                            # Match tool call name
                            tool_name = getattr(msg, "name", "") or getattr(msg, "tool_name", "") or ""
                            for target_agent in ["syllabus_reader_agent", "search_agent", "curriculum_writer_agent", "quiz_exercise_agent"]:
                                if target_agent in tool_name and content:
                                    # Skip transition messages
                                    if is_handoff_message(content):
                                        continue
                                        
                                    if target_agent == "syllabus_reader_agent":
                                        syllabus_summary = content
                                        await websocket.send_json({
                                            "type": "agent_result",
                                            "agent": target_agent,
                                            "data": syllabus_summary
                                        })
                                    elif target_agent == "search_agent":
                                        search_results = content
                                        await websocket.send_json({
                                            "type": "agent_result",
                                            "agent": target_agent,
                                            "data": search_results
                                        })
                                    elif target_agent == "curriculum_writer_agent":
                                        curriculum_report = content
                                        await websocket.send_json({
                                            "type": "agent_result",
                                            "agent": target_agent,
                                            "data": curriculum_report
                                        })
                                    elif target_agent == "quiz_exercise_agent":
                                        quizzes_data = strip_json_fence(content)
                                        
                                        try:
                                            parsed_quizzes = json.loads(quizzes_data)
                                            await websocket.send_json({
                                                "type": "agent_result",
                                                "agent": target_agent,
                                                "data": parsed_quizzes
                                            })
                                        except Exception:
                                            await websocket.send_json({
                                                "type": "agent_result",
                                                "agent": target_agent,
                                                "data": quizzes_data
                                            })
                        else:
                            sender = getattr(msg, "name", "") or ""
                            if is_handoff_message(content):
                                continue
                            if "syllabus_reader_agent" in sender:
                                syllabus_summary = content
                                await websocket.send_json({
                                    "type": "agent_result",
                                    "agent": "syllabus_reader_agent",
                                    "data": syllabus_summary
                                })
                            elif "search_agent" in sender:
                                search_results = content
                                await websocket.send_json({
                                    "type": "agent_result",
                                    "agent": "search_agent",
                                    "data": search_results
                                })
                            elif "curriculum_writer_agent" in sender:
                                curriculum_report = content
                                await websocket.send_json({
                                    "type": "agent_result",
                                    "agent": "curriculum_writer_agent",
                                    "data": curriculum_report
                                })
                            elif "quiz_exercise_agent" in sender:
                                quizzes_data = strip_json_fence(content)
                                try:
                                    parsed_quizzes = json.loads(quizzes_data)
                                    await websocket.send_json({
                                        "type": "agent_result",
                                        "agent": "quiz_exercise_agent",
                                        "data": parsed_quizzes
                                    })
                                except Exception:
                                    await websocket.send_json({
                                        "type": "agent_result",
                                        "agent": "quiz_exercise_agent",
                                        "data": quizzes_data
                                    })
                        
                # Update partial results in SQLite
                async with async_session() as db:
                    result = await db.execute(select(Generation).where(Generation.id == gen_id))
                    gen_record = result.scalar_one_or_none()
                    if gen_record:
                        if syllabus_summary:
                            gen_record.syllabus_summary = syllabus_summary
                        if search_results:
                            gen_record.search_results = search_results
                        if curriculum_report:
                            gen_record.curriculum_report = curriculum_report
                        if quizzes_data:
                            gen_record.quizzes_data = quizzes_data
                        await db.commit()
                        
        # 5. Pipeline completed - final parsing fallback to guarantee all outputs are captured
        for msg in all_messages:
            content = message_content_to_text(getattr(msg, "content", ""))
            if not content:
                continue
                
            # Skip framework transitions and handoff messages
            if is_handoff_message(content):
                continue
                
            sender = getattr(msg, "name", "") or ""
            
            # Identify by sender name (prefer longer content to avoid intermediate prompts/replies)
            if "syllabus_reader" in sender:
                if len(content) > len(syllabus_summary) and "Successfully transferred" not in content:
                    syllabus_summary = content
            elif "search_agent" in sender:
                if len(content) > len(search_results) and "Successfully transferred" not in content:
                    search_results = content
            elif "curriculum_writer" in sender:
                if len(content) > len(curriculum_report) and "Successfully transferred" not in content:
                    curriculum_report = content
            elif "quiz_exercise" in sender:
                if len(content) > len(quizzes_data) and "Successfully transferred" not in content:
                    quizzes_data = strip_json_fence(content)
            else:
                # Heuristic patterns fallback
                content_lower = content.lower()
                
                # Pattern 1: Quiz/Exercise JSON Data
                if ("\"modules\"" in content or "'modules'" in content) and ("\"quiz\"" in content or "'quiz'" in content or "\"exercises\"" in content or "'exercises'" in content):
                    if content.strip().startswith("{") or "```json" in content:
                        raw_quizzes = strip_json_fence(content)
                        if len(raw_quizzes) > len(quizzes_data):
                            quizzes_data = raw_quizzes
                            
                # Pattern 2: Full Curriculum Report (Markdown)
                elif ("introduction" in content_lower or "report outline" in content_lower) and ("modules" in content_lower or "lesson breakdown" in content_lower or "timelines" in content_lower):
                    if len(content) > len(curriculum_report) and len(content) > 300:
                        curriculum_report = content
                        
                # Pattern 3: Outdated Syllabus Summary
                elif "program:" in content_lower and "institution:" in content_lower:
                    if len(content) > len(syllabus_summary) and len(content) < 5000:
                        syllabus_summary = content
                        
                # Pattern 4: Web Search Research Results
                elif ("search results" in content_lower or "tavily" in content_lower or "market research" in content_lower or "skills gap" in content_lower) and len(content) > 100:
                    if len(content) > len(search_results) and len(content) < 15000:
                        search_results = content

        final_quizzes = {}
        try:
            final_quizzes = json.loads(quizzes_data)
        except Exception:
            pass
            
        final_payload = {
            "curriculum_report": curriculum_report,
            "quizzes_data": final_quizzes,
            "search_results": search_results,
            "syllabus_summary": syllabus_summary
        }
        
        async with async_session() as db:
            result = await db.execute(select(Generation).where(Generation.id == gen_id))
            gen_record = result.scalar_one_or_none()
            if gen_record:
                gen_record.syllabus_summary = syllabus_summary
                gen_record.search_results = search_results
                gen_record.curriculum_report = curriculum_report
                gen_record.quizzes_data = quizzes_data
                gen_record.status = "complete"
                gen_record.completed_at = datetime.utcnow()
                await db.commit()
                
        await websocket.send_json({
            "type": "complete",
            "generation_id": gen_id,
            "data": final_payload
        })
        
    except WebSocketDisconnect:
        pass
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        if gen_id:
            try:
                async with async_session() as db:
                    result = await db.execute(select(Generation).where(Generation.id == gen_id))
                    gen_record = result.scalar_one_or_none()
                    if gen_record:
                        gen_record.status = "error"
                        gen_record.error_message = f"{str(e)}\n{tb}"
                        await db.commit()
            except Exception:
                pass
            
        try:
            await websocket.send_json({
                "type": "error",
                "message": f"An error occurred: {str(e)}"
            })
        except Exception:
            pass
