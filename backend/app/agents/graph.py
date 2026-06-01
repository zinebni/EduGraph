from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.prebuilt import create_react_agent
from langgraph_supervisor import create_supervisor
from app.tools.read_syllabus import read_syllabus
from app.tools.tavily_search import create_tavily_tool
from app.agents.supervisor import SUPERVISOR_PROMPT
from app.agents.syllabus_reader import SYLLABUS_READER_PROMPT
from app.agents.search_agent import SEARCH_AGENT_PROMPT
from app.agents.curriculum_writer import CURRICULUM_WRITER_PROMPT
from app.agents.quiz_exercise import QUIZ_EXERCISE_PROMPT

def build_graph(google_api_key: str, tavily_api_key: str, model_name: str = "gemini-3.1-flash-lite"):
    """Build the LangGraph multi-agent workflow dynamically with provided API keys."""
    
    # 1. Create LLM instance
    llm = ChatGoogleGenerativeAI(
        model=model_name,
        temperature=0.7,  # slightly lowered for more stable structure/JSON formatting
        google_api_key=google_api_key,
    )
    
    # 2. Create tools
    tavily_tool = create_tavily_tool(tavily_api_key)
    
    # 3. Create agents
    syllabus_reader_agent = create_react_agent(
        model=llm, tools=[read_syllabus],
        name="syllabus_reader_agent", prompt=SYLLABUS_READER_PROMPT,
    )
    
    search_agent = create_react_agent(
        model=llm, tools=[tavily_tool],
        name="search_agent", prompt=SEARCH_AGENT_PROMPT,
    )
    
    curriculum_writer_agent = create_react_agent(
        model=llm, tools=[],
        name="curriculum_writer_agent", prompt=CURRICULUM_WRITER_PROMPT,
    )
    
    quiz_exercise_agent = create_react_agent(
        model=llm, tools=[],
        name="quiz_exercise_agent", prompt=QUIZ_EXERCISE_PROMPT,
    )
    
    # 4. Create supervisor workflow
    workflow = create_supervisor(
        agents=[syllabus_reader_agent, search_agent, curriculum_writer_agent, quiz_exercise_agent],
        model=llm,
        prompt=SUPERVISOR_PROMPT,
    )
    
    # 5. Compile and return
    return workflow.compile()
