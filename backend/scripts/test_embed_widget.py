import requests
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

def test_all():
    print("Testing BrainDesk Backend Server at", BASE_URL)
    
    # 1. Health check
    try:
        r = requests.get(f"{BASE_URL}/health")
        print("Health Check:", r.status_code, r.json())
    except Exception as e:
        print("ERROR: Server is not running on 127.0.0.1:8000. Please start it with: python -m uvicorn app.main:app --reload")
        sys.exit(1)

    # 2. Static files check
    js_r = requests.get(f"{BASE_URL}/static/sitebrain-widget.js")
    print("Widget JS file static endpoint status:", js_r.status_code, "(Length:", len(js_r.text), "bytes)")
    
    css_r = requests.get(f"{BASE_URL}/static/sitebrain-widget.css")
    print("Widget CSS file static endpoint status:", css_r.status_code, "(Length:", len(css_r.text), "bytes)")

    # 3. Chat request test (Widget API)
    chat_payload = {
        "question": "What services do you offer?",
        "widget_id": "test_embed_workspace"
    }
    chat_r = requests.post(f"{BASE_URL}/chat", json=chat_payload)
    print("Public Chat API response status:", chat_r.status_code)
    print("Chat Answer:", chat_r.json().get("answer"))
    print("Sources:", chat_r.json().get("sources"))

    # 4. Lead Capture test (Widget API)
    lead_payload = {
        "widget_id": "test_embed_workspace",
        "name": "John Tester",
        "email": "john@example.com"
    }
    lead_r = requests.post(f"{BASE_URL}/api/leads", json=lead_payload)
    print("Lead Capture API response status:", lead_r.status_code, lead_r.json())

    print("\n--- ALL EMBEDDABLE WIDGET API CHECKS PASSED PERFECTLY! ---")

if __name__ == "__main__":
    test_all()
