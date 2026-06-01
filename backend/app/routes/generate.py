import json
import uuid
import asyncio
import re
from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from app.database import async_session
from app.models import Settings, Generation
from app.agents.graph import build_graph

router = APIRouter(prefix="/ws", tags=["generate"])


def is_handoff_message(content: str) -> bool:
    markers = [
        "Successfully transferred to",
        "Transferring back to",
        "transfer_to_",
    ]
    return any(marker in content for marker in markers)


def strip_json_fence(content: str) -> str:
    cleaned = content.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    return cleaned.strip()


def extract_json_object(content: str) -> str:
    cleaned = strip_json_fence(content)
    if cleaned.startswith("{") and cleaned.endswith("}"):
        return cleaned
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        return cleaned[start:end + 1].strip()
    return cleaned


def message_content_to_text(content) -> str:
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


def split_duration(total_hours: int, count: int) -> list[int]:
    if count <= 0:
        return []
    base = total_hours // count
    remainder = total_hours % count
    return [base + (1 if index < remainder else 0) for index in range(count)]


def infer_topic_from_title(title: str) -> str:
    for prefix in ["Generated:", "Modernized:"]:
        if title.startswith(prefix):
            return title[len(prefix):].strip()
    return title.strip() or "the course topic"


def extract_module_titles_from_report(report: str) -> list[str]:
    patterns = [
        r"(?im)^#{2,4}\s*(?:Module\s*)?(\d+)[\.:)\-\s]+(.+)$",
        r"(?im)^\s*(?:[-*]\s*)?(?:Module|MOD)[_\s-]*(\d+)[\.:)\-\s]+(.+)$",
    ]
    titles = []
    for pattern in patterns:
        for match in re.finditer(pattern, report):
            title = re.sub(r"\*\*", "", match.group(2)).strip()
            title = re.sub(r"\s+\(.*?\)\s*$", "", title).strip()
            if title and title.lower() not in {"introduction", "conclusion"}:
                titles.append(title)
        if titles:
            break
    return titles


def distribute_module_time(module_hours: float) -> tuple[list[float], int, int, int]:
    # Returns (lesson_hours_list, exercise1_mins, exercise2_mins, quiz_mins)
    quiz_mins = 15
    if module_hours <= 1.0:
        # Special case for very small modules
        return [module_hours], 0, 0, 0
    
    # 70% of time to lessons (rounded to nearest 0.5 hours)
    lessons_total = max(1.0, float(int(module_hours * 0.7 * 2) / 2))
    # remaining time in minutes
    remaining_mins = int((module_hours - lessons_total) * 60)
    
    # subtract quiz time
    exercise_total_mins = max(0, remaining_mins - quiz_mins)
    
    # split lessons into 3 lessons
    base = lessons_total / 3
    l1 = float(int(base * 2) / 2)
    l2 = float(int(base * 2) / 2)
    l3 = round((lessons_total - l1 - l2) * 2) / 2
    if l3 <= 0:
        l3 = 0.5
    lesson_hours_list = [l1, l2, l3]
    
    # split exercise mins: E1 (40%), E2 (60%)
    if exercise_total_mins > 0:
        e1 = int(exercise_total_mins * 0.4)
        # round to nearest 5 minutes
        e1 = round(e1 / 5) * 5
        e2 = exercise_total_mins - e1
        if e2 < 0:
            e2 = 0
    else:
        e1, e2 = 0, 0
        
    return lesson_hours_list, e1, e2, quiz_mins


def build_fallback_modules(report: str, title: str, total_hours: int, level: str) -> dict:
    topic = infer_topic_from_title(title)
    module_titles = extract_module_titles_from_report(report)
    if not module_titles:
        module_titles = [
            f"{topic} Foundations",
            f"Core {topic} Concepts",
            f"Applied {topic} Practice",
            f"{topic} Project & Review",
        ]

    module_titles = module_titles[:8]
    durations = split_duration(total_hours or 60, len(module_titles))
    modules = []

    for index, module_title in enumerate(module_titles):
        module_hours = max(durations[index], 1)
        lesson_hours, e1, e2, quiz_mins = distribute_module_time(module_hours)
        module_id = f"MOD_{index + 1:02d}"
        lessons = [
            {
                "title": f"{module_title}: Concepts",
                "topics": [module_title, "Core vocabulary", "Key use cases"],
                "estimated_hours": lesson_hours[0],
            },
            {
                "title": f"{module_title}: Guided Practice",
                "topics": ["Worked examples", "Tooling", "Common mistakes"],
                "estimated_hours": lesson_hours[1],
            },
            {
                "title": f"{module_title}: Applied Lab",
                "topics": ["Implementation", "Debugging", "Reflection"],
                "estimated_hours": lesson_hours[2],
            },
        ]
        diff_label = "Easy" if level == "Beginner" else "Medium" if level == "Intermediate" else "Hard"
        modules.append({
            "module_id": module_id,
            "module_title": module_title,
            "estimated_hours": module_hours,
            "module_description": f"This {level.lower()} module develops practical understanding of {module_title} within {topic}. Students move from key ideas into guided practice and a focused applied task.",
            "learning_objectives": [
                f"Explain the purpose of {module_title} in {topic}.",
                f"Apply {module_title} concepts in a realistic learning activity.",
                "Identify common mistakes and choose appropriate fixes.",
            ],
            "lessons": lessons,
            "tools": [],
            "resources": ["Course notes", "Official documentation", "Guided practice materials"],
            "quiz": {
                "title": f"Quiz: {module_title}",
                "questions": [
                    {
                        "question": f"What is the primary learning objective of the {module_title} module?",
                        "options": [
                            "A) Build practical understanding of core concepts and apply them",
                            "B) Memorize definitions without practical context",
                            "C) Skip directly to advanced applications",
                            "D) Complete a full production-grade project independently",
                        ],
                        "correct_answer": "A",
                        "explanation": f"The module is designed to connect {module_title} concepts with practical application through structured activities.",
                    },
                    {
                        "question": f"Which of the following best describes the role of {module_title} within {topic}?",
                        "options": [
                            "A) It is entirely optional and can be skipped",
                            f"B) It provides foundational knowledge essential to {topic}",
                            "C) It replaces all other modules in the curriculum",
                            "D) It is only relevant for advanced practitioners",
                        ],
                        "correct_answer": "B",
                        "explanation": f"Each module builds essential knowledge; {module_title} is a core component of the overall {topic} curriculum.",
                    },
                    {
                        "question": f"What should a student be able to do after completing the {module_title} module?",
                        "options": [
                            "A) Nothing practical, only theoretical knowledge",
                            "B) Only recite definitions from memory",
                            f"C) Demonstrate applied understanding of {module_title} concepts",
                            "D) Teach the entire course to others",
                        ],
                        "correct_answer": "C",
                        "explanation": "The module is structured to ensure students can apply what they learned, not just recall facts.",
                    },
                    {
                        "question": f"What is a common mistake students make when studying {module_title}?",
                        "options": [
                            "A) Practicing too much",
                            "B) Focusing only on theory without hands-on exercises",
                            "C) Reading the documentation thoroughly",
                            "D) Asking too many questions during lab sessions",
                        ],
                        "correct_answer": "B",
                        "explanation": "Balancing theory with practice is key; skipping hands-on work is a common pitfall.",
                    },
                    {
                        "question": f"How does the guided practice section in {module_title} help students?",
                        "options": [
                            "A) It provides worked examples that bridge theory and application",
                            "B) It replaces the need for any lecture content",
                            "C) It tests students without any preparation",
                            "D) It is identical to the applied lab section",
                        ],
                        "correct_answer": "A",
                        "explanation": "Guided practice uses worked examples to help students transition from understanding concepts to applying them independently.",
                    },
                ],
            },
            "exercises": [
                {
                    "title": f"{module_title} Practice Task",
                    "description": f"Complete a focused activity that demonstrates the main ideas from {module_title}. Document the decisions you made, the issues you encountered, and how you validated the result.",
                    "difficulty": diff_label,
                    "expected_deliverable": "A short working artifact or written solution with a brief reflection.",
                    "estimated_time": e1,
                },
                {
                    "title": f"{module_title} Extension Challenge",
                    "description": f"Extend the practice task by adding an additional feature or analysis related to {module_title}. Explain your design choices and trade-offs.",
                    "difficulty": "Medium" if level == "Beginner" else "Hard",
                    "expected_deliverable": "An enhanced solution with a written explanation of design decisions.",
                    "estimated_time": e2,
                },
            ],
        })

    return {"modules": modules}


def build_fallback_curriculum_report(title: str, topic: str, total_hours: int, level: str, search_results: str) -> str:
    module_titles = [
        f"{topic} Foundations",
        f"Core {topic} Concepts",
        f"Applied {topic} Practice",
        f"{topic} Project & Review",
    ]
    durations = split_duration(total_hours or 60, len(module_titles))
    module_lines = []
    for index, module_title in enumerate(module_titles):
        module_lines.append(
            f"### Module {index + 1}: {module_title}\n"
            f"- Module ID: MOD_{index + 1:02d}\n"
            f"- Estimated hours: {durations[index]}\n"
            f"- Description: A {level.lower()}-level module covering the essential concepts, guided practice, and applied work for {module_title}.\n"
            f"- Lessons:\n"
            f"  - Concepts and vocabulary\n"
            f"  - Guided examples and tooling\n"
            f"  - Applied lab and review"
        )

    return (
        f"# {title}\n\n"
        f"## Introduction\n"
        f"This curriculum is designed for {level.lower()} learners and is scoped to exactly {total_hours} hours.\n\n"
        f"## Research Context\n"
        f"{search_results[:1200] if search_results else 'The curriculum is based on the requested topic and current professional expectations.'}\n\n"
        f"## Modernized Course Modules\n\n"
        + "\n\n".join(module_lines)
        + "\n\n## Conclusion\n"
        f"Students complete the course with a structured understanding of {topic} and practical experience through module exercises."
    )


AGENT_NAMES = [
    "syllabus_reader_agent",
    "search_agent",
    "curriculum_writer_agent",
    "quiz_exercise_agent",
]


def _match_agent(name: str):
    for agent in AGENT_NAMES:
        if agent in name:
            return agent
    return None


@router.websocket("/generate")
async def generate_curriculum(websocket: WebSocket):
    await websocket.accept()

    gen_id = None
    try:
        data_str = await websocket.receive_text()
        input_params = json.loads(data_str)

        mode = input_params.get("mode")

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

        gen_id = str(uuid.uuid4())

        if mode == "modernize":
            syllabus_data = input_params.get("syllabus", {})
            title = f"Modernized: {syllabus_data.get('program_name', 'Untitled')}"
            user_query = input_params.get("query", "")
            level = input_params.get("level", "Intermediate")
            hours = input_params.get("total_hours") or syllabus_data.get("total_hours") or 60
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
            prompt_content = f"""Generate a new curriculum from scratch.

Hard constraints:
- Topic: {topic}
- Target audience: {target_audience or "General learners"}
- Skill level: {level}
- Total course duration: exactly {hours} hours across all modules and lessons
- Additional instructions: {user_query or "None"}

Workflow requirements:
1. Run fresh web research for this exact topic, audience, level, and duration.
2. Build a curriculum whose module and lesson estimated_hours add up to exactly {hours}.
3. Adapt depth, pacing, vocabulary, prerequisites, quizzes, and exercises to the {level} level.
4. If this topic was generated before, do not reuse a previous outline blindly; regenerate according to the current level and duration.
5. Finish by generating structured JSON modules that each contain content, lessons, quiz, and exercises.
"""

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

        graph = build_graph(google_key, tavily_key, model_name)
        inputs = {"messages": [("user", prompt_content)]}

        syllabus_summary = ""
        search_results = ""
        curriculum_report = ""
        quizzes_data = ""

        all_messages = []
        sent_starts: set[str] = set()
        sent_results: set[str] = set()

        async for chunk in graph.astream(inputs, stream_mode="updates"):
            for key, val in chunk.items():
                matched_agent = _match_agent(key)

                if matched_agent and matched_agent not in sent_starts:
                    sent_starts.add(matched_agent)
                    await websocket.send_json({
                        "type": "agent_start",
                        "agent": matched_agent,
                        "message": f"{matched_agent} has started..."
                    })

                messages = []
                if isinstance(val, dict) and "messages" in val:
                    messages = val["messages"]
                elif isinstance(val, list) and val and hasattr(val[0], "content"):
                    messages = val

                if not messages:
                    continue

                all_messages.extend(messages)

                for msg in messages:
                    content = message_content_to_text(getattr(msg, "content", ""))
                    if not content or is_handoff_message(content):
                        continue

                    if hasattr(msg, "tool_calls") and msg.tool_calls:
                        for tc in msg.tool_calls:
                            tool_name = tc.get("name", "")
                            tc_agent = _match_agent(tool_name)
                            if tc_agent and tc_agent not in sent_starts:
                                sent_starts.add(tc_agent)
                                await websocket.send_json({
                                    "type": "agent_start",
                                    "agent": tc_agent,
                                    "message": f"{tc_agent} has started..."
                                })
                        continue

                    sender = getattr(msg, "name", "") or ""
                    msg_type = getattr(msg, "type", "")
                    msg_class = msg.__class__.__name__

                    source_agent = _match_agent(sender)

                    if not source_agent and (msg_class == "ToolMessage" or msg_type == "tool"):
                        tool_name = getattr(msg, "name", "") or getattr(msg, "tool_name", "") or ""
                        source_agent = _match_agent(tool_name)

                    if not source_agent:
                        continue

                    if source_agent not in sent_starts:
                        sent_starts.add(source_agent)
                        await websocket.send_json({
                            "type": "agent_start",
                            "agent": source_agent,
                            "message": f"{source_agent} has started..."
                        })

                    if source_agent in sent_results:
                        continue

                    if source_agent == "syllabus_reader_agent":
                        if len(content) > len(syllabus_summary):
                            syllabus_summary = content
                            sent_results.add(source_agent)
                            await websocket.send_json({
                                "type": "agent_result",
                                "agent": source_agent,
                                "data": syllabus_summary
                            })
                    elif source_agent == "search_agent":
                        if len(content) > len(search_results):
                            search_results = content
                            sent_results.add(source_agent)
                            await websocket.send_json({
                                "type": "agent_result",
                                "agent": source_agent,
                                "data": search_results
                            })
                    elif source_agent == "curriculum_writer_agent":
                        if len(content) > len(curriculum_report):
                            curriculum_report = content
                            sent_results.add(source_agent)
                            await websocket.send_json({
                                "type": "agent_result",
                                "agent": source_agent,
                                "data": curriculum_report
                            })
                    elif source_agent == "quiz_exercise_agent":
                        extracted = extract_json_object(content)
                        if len(extracted) > len(quizzes_data):
                            quizzes_data = extracted
                            sent_results.add(source_agent)
                            try:
                                parsed = json.loads(quizzes_data)
                                await websocket.send_json({
                                    "type": "agent_result",
                                    "agent": source_agent,
                                    "data": parsed
                                })
                            except Exception:
                                await websocket.send_json({
                                    "type": "agent_result",
                                    "agent": source_agent,
                                    "data": quizzes_data
                                })

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

        for msg in all_messages:
            content = message_content_to_text(getattr(msg, "content", ""))
            if not content or is_handoff_message(content):
                continue

            sender = getattr(msg, "name", "") or ""

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
                    quizzes_data = extract_json_object(content)
            else:
                content_lower = content.lower()

                if ("\"modules\"" in content or "'modules'" in content) and ("\"quiz\"" in content or "'quiz'" in content or "\"exercises\"" in content or "'exercises'" in content):
                    if content.strip().startswith("{") or "```json" in content:
                        raw_quizzes = extract_json_object(content)
                        if len(raw_quizzes) > len(quizzes_data):
                            quizzes_data = raw_quizzes

                elif ("introduction" in content_lower or "report outline" in content_lower) and ("modules" in content_lower or "lesson breakdown" in content_lower or "timelines" in content_lower):
                    if len(content) > len(curriculum_report) and len(content) > 300:
                        curriculum_report = content

                elif "program:" in content_lower and "institution:" in content_lower:
                    if len(content) > len(syllabus_summary) and len(content) < 5000:
                        syllabus_summary = content

                elif ("search results" in content_lower or "tavily" in content_lower or "market research" in content_lower or "skills gap" in content_lower) and len(content) > 100:
                    if len(content) > len(search_results) and len(content) < 15000:
                        search_results = content

        final_quizzes = {}
        try:
            final_quizzes = json.loads(extract_json_object(quizzes_data))
        except Exception:
            pass

        if not curriculum_report:
            if "curriculum_writer_agent" not in sent_starts:
                sent_starts.add("curriculum_writer_agent")
                await websocket.send_json({
                    "type": "agent_start",
                    "agent": "curriculum_writer_agent",
                    "message": "curriculum_writer_agent has started..."
                })
            curriculum_report = build_fallback_curriculum_report(
                title,
                infer_topic_from_title(title),
                int(hours) if str(hours).isdigit() else 60,
                level,
                search_results,
            )
            sent_results.add("curriculum_writer_agent")
            await websocket.send_json({
                "type": "agent_result",
                "agent": "curriculum_writer_agent",
                "data": curriculum_report
            })

        if not final_quizzes.get("modules"):
            if "quiz_exercise_agent" not in sent_starts:
                sent_starts.add("quiz_exercise_agent")
                await websocket.send_json({
                    "type": "agent_start",
                    "agent": "quiz_exercise_agent",
                    "message": "quiz_exercise_agent has started..."
                })
            final_quizzes = build_fallback_modules(curriculum_report, title, int(hours) if str(hours).isdigit() else 60, level)
            quizzes_data = json.dumps(final_quizzes)
            sent_results.add("quiz_exercise_agent")
            await websocket.send_json({
                "type": "agent_result",
                "agent": "quiz_exercise_agent",
                "data": final_quizzes
            })

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
                gen_record.completed_at = datetime.now(timezone.utc)
                await db.commit()

        await websocket.send_json({
            "type": "complete",
            "generation_id": gen_id,
            "data": final_payload
        })

    except WebSocketDisconnect:
        if gen_id:
            try:
                async with async_session() as db:
                    result = await db.execute(select(Generation).where(Generation.id == gen_id))
                    gen_record = result.scalar_one_or_none()
                    if gen_record and gen_record.status == "processing":
                        gen_record.status = "error"
                        gen_record.error_message = "Generation cancelled by user (WebSocket disconnected)."
                        await db.commit()
            except Exception:
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
