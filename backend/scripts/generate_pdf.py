import fitz
import os

pdf_path = "sample.pdf"

print("Generating dummy PDF...")
doc = fitz.open()
page = doc.new_page()

text = """
Flex Gym - Frequently Asked Questions

1. What are your operating hours?
We are open from 5:00 AM to 11:00 PM, Monday through Sunday.

2. How much is a membership?
Our standard membership is $40 per month. We also offer a premium membership for $70 per month which includes access to the sauna and pool.

3. What is your cancellation policy?
You must provide a 30-day written notice to cancel your membership. There are no cancellation fees.

4. Do you offer personal training?
Yes! Our certified personal trainers are available for $50 per session. You can book them at the front desk.

5. Are there group classes?
Yes, we offer Yoga on Tuesdays at 6 PM, and HIIT on Thursdays at 7 AM. These are free for all members.
"""

page.insert_text((50, 50), text, fontsize=12)
doc.save(pdf_path)
doc.close()

print(f"Successfully created {pdf_path}!")
