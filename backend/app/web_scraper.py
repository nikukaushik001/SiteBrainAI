import requests
from bs4 import BeautifulSoup
import re
from typing import Dict, Any
from urllib.parse import urljoin

def scrape_url(url: str) -> Dict[str, Any]:
    """
    Fetches a web page URL, cleans HTML tags and scripts, and extracts clean text content.
    Supports both traditional static HTML websites and modern Single Page Applications (React/Vite SPAs).
    """
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

        # Extract title
        title = soup.title.string.strip() if soup.title and soup.title.string else url

        # Remove non-content elements for standard HTML extraction
        soup_copy = BeautifulSoup(response.text, "html.parser")
        for element in soup_copy(["script", "style", "noscript", "svg", "iframe"]):
            element.decompose()

        # Method 1: Extract text from HTML body
        raw_text = soup_copy.get_text(separator="\n")
        lines = [line.strip() for line in raw_text.splitlines() if line.strip()]

        clean_lines = []
        seen = set()
        for line in lines:
            if line not in seen and len(line) > 1:
                seen.add(line)
                clean_lines.append(line)

        clean_text = "\n".join(clean_lines)

        # Method 2: If HTML body text is empty or very short (< 50 chars), fallback to SPA JS bundle extraction
        if len(clean_text) < 50:
            print(f"SPA shell detected for {url}. Parsing JavaScript bundles...")
            scripts = [s.get("src") for s in soup.find_all("script") if s.get("src")]

            js_strings = []
            for script_src in scripts:
                js_url = urljoin(url, script_src)
                try:
                    js_res = requests.get(js_url, headers=headers, timeout=12)
                    if js_res.status_code == 200:
                        # Extract JSX children strings and template strings
                        jsx_text = re.findall(r'children:\s*["`\']([^"`\']{3,300})["`\']', js_res.text)
                        for txt in jsx_text:
                            txt_clean = txt.strip()
                            if txt_clean and not txt_clean.startswith("@import") and len(txt_clean) > 2:
                                if txt_clean not in js_strings:
                                    js_strings.append(txt_clean)
                except Exception:
                    pass

            if js_strings:
                clean_text = f"Website Title: {title}\n\n" + "\n".join(js_strings)

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
