from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        conn.execute(text('ALTER TABLE tenants ADD COLUMN allowed_domains TEXT'))
        conn.commit()
        print('Added allowed_domains column successfully.')
    except Exception as e:
        print(f'Column might already exist or error: {e}')
        conn.rollback()
