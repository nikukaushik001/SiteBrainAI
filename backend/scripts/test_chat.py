import requests

url = "http://127.0.0.1:8000/chat"

print("🤖 Welcome to the SiteBrainAI Tester!")
print("Ask a question about the Flex Gym (or type 'exit' to quit).")

while True:
    question = input("\nYou: ")
    if question.lower() == 'exit':
        break
        
    print("Thinking...")
    
    # This is the JSON payload we send to our FastAPI backend
    payload = {
        "question": question
    }
    
    try:
        response = requests.post(url, json=payload)
        data = response.json()
        print(f"\n🤖 AI: {data['answer']}")
    except Exception as e:
        print(f"\nError connecting to server: {e}")
        print("Make sure your FastAPI server is running in another terminal!")
