from langchain_core.tools import tool
import json
import os

@tool
def read_syllabus(syllabus_input: str) -> str:
    """Read and parse a JSON syllabus. Accepts either:
    - A file path to a JSON file (e.g., "data/sample_syllabus.json")
    - A raw JSON string containing the syllabus data

    This mirrors the spec's read_portfolio_agent which reads from provided paths.

    Args:
        syllabus_input: Either a file path to a JSON syllabus or a raw JSON string
    """
    try:
        # Try as file path first (matches spec: "reading from provided paths")
        if os.path.exists(syllabus_input):
            with open(syllabus_input, "r") as f:
                data = json.load(f)
        else:
            # Fall back to parsing as raw JSON string
            data = json.loads(syllabus_input)

        summary_parts = []
        summary_parts.append(f"Program: {data.get('program_name', 'Unknown')}")
        summary_parts.append(f"Institution: {data.get('institution', 'Unknown')}")
        summary_parts.append(f"Target Audience: {data.get('target_audience', 'Unknown')}")
        summary_parts.append(f"Total Hours: {data.get('total_hours', 'Unknown')}")
        summary_parts.append(f"\nModules ({len(data.get('modules', []))}):")

        for module in data.get("modules", []):
            summary_parts.append(f"\n  [{module.get('module_id', '?')}] {module.get('title', 'Untitled')}")
            summary_parts.append(f"    Hours: {module.get('hours', '?')}")
            summary_parts.append(f"    Topics: {', '.join(module.get('topics', []))}")
            prereqs = module.get("prerequisites", [])
            if prereqs:
                summary_parts.append(f"    Prerequisites: {', '.join(prereqs)}")

        return "\n".join(summary_parts)
    except json.JSONDecodeError as e:
        return f"Error parsing syllabus JSON: {str(e)}"
    except FileNotFoundError as e:
        return f"Error: Syllabus file not found: {str(e)}"
    except Exception as e:
        return f"Error reading syllabus: {str(e)}"
