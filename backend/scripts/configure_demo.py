"""Configure the demo tenant with a proper system prompt."""
from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Add missing columns if they don't exist
    try:
        conn.execute(text('ALTER TABLE tenants ADD COLUMN starter_prompts TEXT'))
        conn.commit()
        print('Added starter_prompts column')
    except Exception as e:
        print(f'starter_prompts already exists or error: {e}')
        conn.rollback()
    
    try:
        conn.execute(text('ALTER TABLE tenants ADD COLUMN webhook_url TEXT'))
        conn.commit()
        print('Added webhook_url column')
    except Exception as e:
        print(f'webhook_url already exists or error: {e}')
        conn.rollback()

    demo_prompt = (
        "You are SiteBrain AI, a live demo agent on the SiteBrain AI product website. "
        "Your job is to impress prospective business clients by showcasing what you can do.\n\n"
        "About SiteBrain AI (answer these accurately):\n"
        "- SiteBrain AI lets businesses deploy an intelligent AI chatbot on their website in under 5 minutes.\n"
        "- It works by uploading PDFs, documents (DOCX, TXT, CSV), or crawling a website URL. The AI learns everything and answers customer questions 24/7.\n"
        "- KILLER FEATURE: Voice AI - customers can click the microphone and SPEAK to the chatbot. The AI listens and speaks back. Uses free native browser APIs, no extra cost.\n"
        "- It includes analytics, sentiment analysis, unanswered question tracking, lead capture, and CRM integrations.\n"
        "- Setup takes 3 steps: Upload knowledge -> Customize widget -> Copy embed code to website.\n"
        "- The widget is a single line of HTML code that works on any website.\n\n"
        "Your personality: Be enthusiastic, confident, concise. You are selling this product. "
        "End responses by encouraging them to try features like Voice AI.\n"
    )
    
    starters = "What is SiteBrain AI?, How does Voice AI work?"

    existing = conn.execute(text("SELECT id FROM tenants WHERE id = 'default'")).fetchone()
    if existing:
        conn.execute(
            text("UPDATE tenants SET system_prompt = :sp, starter_prompts = :starters WHERE id = 'default'"),
            {"sp": demo_prompt, "starters": starters}
        )
        print("Updated default tenant")
    else:
        conn.execute(
            text("INSERT INTO tenants (id, name, system_prompt, starter_prompts) VALUES ('default', 'SiteBrain AI Demo', :sp, :starters)"),
            {"sp": demo_prompt, "starters": starters}
        )
        print("Created default tenant")
    conn.commit()

print("Demo tenant configured successfully!")
