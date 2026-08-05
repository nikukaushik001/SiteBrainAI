import requests
from typing import Dict, Any

def scrape_url(url: str) -> Dict[str, Any]:
    """
    Fetches a web page URL using Jina AI's Reader (r.jina.ai) to perfectly render JavaScript, 
    handle SPAs, and return clean Markdown content optimized for LLM ingestion.
    """
    url = url.strip()
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url

    # Jina Reader API URL
    jina_url = f"https://r.jina.ai/{url}"

    headers = {
        "User-Agent": "SiteBrainAI-Bot/1.0",
        "Accept": "text/event-stream, text/plain, */*",
        "X-Return-Format": "markdown" # Request clean markdown
    }

    try:
        response = requests.get(jina_url, headers=headers, timeout=30, allow_redirects=True)
        response.raise_for_status()

        clean_text = response.text.strip()
        
        # Jina usually includes the title at the top of the markdown as "Title: ..."
        title = url
        first_line = clean_text.split('\n')[0] if clean_text else ""
        if first_line.lower().startswith("title:"):
            title = first_line.replace("Title:", "").strip()

        if not clean_text or len(clean_text) < 15:
            return {"success": False, "error": f"Could not extract text content from {url}. It may be blocking crawlers.", "url": url}

        return {
            "success": True,
            "url": url,
            "title": title,
            "content": clean_text
        }

    except requests.exceptions.RequestException as req_err:
        return {"success": False, "error": f"Network connection error: {str(req_err)}", "url": url}
    except Exception as e:
        return {"success": False, "error": f"Failed to fetch URL content: {str(e)}", "url": url}
