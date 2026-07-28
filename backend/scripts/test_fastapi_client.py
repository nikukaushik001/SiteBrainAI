from fastapi.testclient import TestClient
from app.main import app
import os

client = TestClient(app)

def test_widget_integration():
    print("--- 1. Testing Health Endpoint ---")
    res = client.get("/health")
    print("GET /health:", res.status_code, res.json())
    assert res.status_code == 200

    print("\n--- 2. Testing Static Widget Script & CSS Serving ---")
    js_res = client.get("/static/sitebrain-widget.js")
    print("GET /static/sitebrain-widget.js:", js_res.status_code, "(Length:", len(js_res.text), "bytes)")
    assert js_res.status_code == 200
    assert "sitebrain-widget-container" in js_res.text

    css_res = client.get("/static/sitebrain-widget.css")
    print("GET /static/sitebrain-widget.css:", css_res.status_code, "(Length:", len(css_res.text), "bytes)")
    assert css_res.status_code == 200
    assert "#sitebrain-widget-container" in css_res.text

    print("\n--- 3. Testing External Widget Chat API Request ---")
    chat_payload = {
        "question": "What is BrainDesk?",
        "widget_id": "proj_demo_external"
    }
    chat_res = client.post("/chat", json=chat_payload)
    print("POST /chat status:", chat_res.status_code)
    data = chat_res.json()
    print("Answer:", data.get("answer"))
    print("Sources:", data.get("sources"))
    print("Widget ID:", data.get("widget_id"))
    assert chat_res.status_code == 200
    assert "answer" in data

    print("\n--- 4. Testing Visitor Lead Capture API ---")
    lead_payload = {
        "widget_id": "proj_demo_external",
        "name": "Jane Visitor",
        "email": "jane@example.com"
    }
    lead_res = client.post("/api/leads", json=lead_payload)
    print("POST /api/leads status:", lead_res.status_code, lead_res.json())
    assert lead_res.status_code == 200

    print("\n==================================================")
    print("SUCCESS: Embedded Widget integration is 100% working!")
    print("==================================================")

if __name__ == "__main__":
    test_widget_integration()
