import requests
from bs4 import BeautifulSoup
import re
from typing import Dict, Any

def scrape_url(url: str) -> Dict[str, Any]:
    """Fetches a web page URL, cleans HTML tags and navigation scripts, and extracts clean text content."""
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 DocsAuraBot/1.0"
    }

    try:
        response = requests.get(url, headers=headers, timeout=12)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")

        # Remove script, style, nav, footer, header elements
        for element in soup(["script", "style", "nav", "footer", "header", "noscript", "svg", "form"]):
            element.decompose()

        # Get page title
        title = soup.title.string.strip() if soup.title and soup.title.string else url

        # Extract text from paragraphs, headings, list items, and main tags
        text = ""
        for tag in soup.find_all(["h1", "h2", "h3", "h4", "p", "li", "article", "section"]):
            content = tag.get_text(separator=" ", strip=True)
            if content and len(content) > 15: # Ignore tiny snippets
                text += content + "\n\n"

        # If tag extraction produced very little text, fallback to get_text()
        if len(text.strip()) < 100:
            text = soup.get_text(separator="\n", strip=True)

        # Clean excessive newlines
        clean_text = re.sub(r'\n{3,}', '\n\n', text).strip()

        if not clean_text or len(clean_text) < 50:
            return {"success": False, "error": "Could not extract sufficient text content from URL.", "url": url}

        return {
            "success": True,
            "url": url,
            "title": title,
            "content": clean_text
        }

    except Exception as e:
        return {"success": False, "error": f"Failed to fetch URL: {str(e)}", "url": url}
