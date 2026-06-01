from langchain_tavily import TavilySearch

def create_tavily_tool(api_key: str) -> TavilySearch:
    """Factory: create TavilySearch tool with the API key from database settings."""
    return TavilySearch(
        max_results=5,
        topic="general",
        tavily_api_key=api_key,
    )
