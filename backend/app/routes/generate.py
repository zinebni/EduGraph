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
        
        # We stream state updates
        async for chunk in graph.astream(inputs, stream_mode="updates"):
            for key, val in chunk.items():
                agent_name = key
                if agent_name == "supervisor":
                    continue
                    
                # Extract the last message from agent
                messages = val.get("messages", [])
                if not messages:
                    continue
                last_msg = messages[-1]
                content = getattr(last_msg, "content", str(last_msg))
                
                # Signal the start of agent
                await websocket.send_json({
                    "type": "agent_start",
                    "agent": agent_name,
                    "message": f"{agent_name} is processing..."
                })
                
                # Wait a tiny bit for realistic UX
                await asyncio.sleep(0.5)
                
                # Let's save the partial results
                if agent_name == "syllabus_reader_agent":
                    syllabus_summary = content
                    await websocket.send_json({
                        "type": "agent_result",
                        "agent": agent_name,
                        "data": syllabus_summary
                    })
                elif agent_name == "search_agent":
                    search_results = content
                    await websocket.send_json({
                        "type": "agent_result",
                        "agent": agent_name,
                        "data": search_results
                    })
                elif agent_name == "curriculum_writer_agent":
                    curriculum_report = content
                    await websocket.send_json({
                        "type": "agent_result",
                        "agent": agent_name,
                        "data": curriculum_report
                    })
                elif agent_name == "quiz_exercise_agent":
                    raw_quizzes = content.strip()
                    if raw_quizzes.startswith("```json"):
                        raw_quizzes = raw_quizzes[7:]
                    if raw_quizzes.endswith("```"):
                        raw_quizzes = raw_quizzes[:-3]
                    quizzes_data = raw_quizzes.strip()
                    
                    try:
                        parsed_quizzes = json.loads(quizzes_data)
                        await websocket.send_json({
                            "type": "agent_result",
                            "agent": agent_name,
                            "data": parsed_quizzes
                        })
                    except Exception:
                        await websocket.send_json({
                            "type": "agent_result",
                            "agent": agent_name,
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
                        
        # 5. Pipeline successfully completed
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
