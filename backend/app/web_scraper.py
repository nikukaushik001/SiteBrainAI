import requests
from bs4 import BeautifulSoup
import re
from typing import Dict, Any

def scrape_url(url: str) -> Dict[str, Any]:
    """Fetches a web page URL, cleans HTML tags and scripts, and extracts clean text content."""
    url = url.strip()
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
    }

    try:
        response = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")

        # Remove non-content elements
        for element in soup(["script", "style", "noscript", "svg", "iframe"]):
            element.decompose()

        # Extract title
        title = soup.title.string.strip() if soup.title and soup.title.string else url

        # Extract lines using newline separator
        raw_text = soup.get_text(separator="\n")
        lines = [line.strip() for line in raw_text.splitlines() if line.strip()]

        # Filter duplicates and tiny noise fragments
        clean_lines = []
        seen = set()
        for line in lines:
            if line not in seen and len(line) > 1:
                seen.add(line)
                clean_lines.append(line)

        clean_text = "\n".join(clean_lines)

        if not clean_text or len(clean_text) < 15:
            return {"success": False, "error": f"Could not extract text content from {url}. Ensure the website is publicly accessible.", "url": url}

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
