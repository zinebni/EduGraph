import asyncio
import json
import sqlite3
from app.agents.graph import build_graph
from app.routes.generate import _match_agent, message_content_to_text, is_handoff_message

async def main():
    conn = sqlite3.connect('edugraph.db')
    cursor = conn.cursor()
    cursor.execute('SELECT google_api_key, tavily_api_key, default_model FROM settings LIMIT 1')
    row = cursor.fetchone()
    if not row:
        print("No API keys found in settings database!")
        return
    google_key, tavily_key, model_name = row
    
    print(f"Building graph with model: {model_name}...")
    graph = build_graph(google_key, tavily_key, model_name)
    
    prompt_content = """Generate a new curriculum from scratch.
Hard constraints:
- Topic: Python Basics
- Target audience: Beginners
- Skill level: Beginner
- Total course duration: exactly 5 hours across all modules and lessons
- Additional instructions: None
"""
    inputs = {"messages": [("user", prompt_content)]}
    
    print("Running graph.astream...")
    async for chunk in graph.astream(inputs, stream_mode="updates"):
        for key, val in chunk.items():
            print(f"\n--- NODE KEY: {key} (matched agent: {_match_agent(key)}) ---")
            
            messages = []
            if isinstance(val, dict) and "messages" in val:
                messages = val["messages"]
            elif isinstance(val, list) and val and hasattr(val[0], "content"):
                messages = val
                
            for i, msg in enumerate(messages):
                sender = getattr(msg, "name", "") or ""
                msg_class = msg.__class__.__name__
                content = message_content_to_text(getattr(msg, "content", ""))
                is_handoff = is_handoff_message(content)
                print(f"  Message #{i}: Class={msg_class}, Name={sender!r}, ContentLen={len(content)}, IsHandoff={is_handoff}")
                if len(content) > 0:
                    print(f"    Content Sample: {content[:150]!r}")

if __name__ == "__main__":
    asyncio.run(main())
