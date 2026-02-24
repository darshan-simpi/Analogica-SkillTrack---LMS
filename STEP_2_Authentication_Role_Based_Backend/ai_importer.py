import google.generativeai as genai
import requests
import json
import re
import os
from PyPDF2 import PdfReader
import io

# Set your Gemini API Key here or in environment variables
# For production, use os.getenv("GEMINI_API_KEY")
GEMINI_API_KEY = "AIzaSyDZqiAXg39tZEKffEARIMaRkHs8VJ6iulE"
genai.configure(api_key=GEMINI_API_KEY)

def extract_text_from_pdf(file_stream):
    """Extracts text from a PDF file stream"""
    try:
        reader = PdfReader(file_stream)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        print(f"Error extracting PDF: {e}")
        return None

def fetch_content_from_url(url):
    """Fetches text content from a URL (Google Drive, Raw Text, etc.)"""
    try:
        # Handle Google Drive share links
        if "drive.google.com" in url and "view" in url:
            file_id = url.split('/')[-2]
            url = f"https://drive.google.com/uc?export=download&id={file_id}"
        
        # Handle Gemini share links (Note: Scanning HTML of share links is limited)
        # If it's a share link, we might need a different approach or tell the user to use text
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        response = requests.get(url, timeout=10, headers=headers)
        response.raise_for_status()
        
        # If it's HTML, try to strip tags roughly for the AI
        if "text/html" in response.headers.get("Content-Type", ""):
            text = re.sub('<[^<]+?>', ' ', response.text)
            return text
            
        return response.text
    except Exception as e:
        print(f"Error fetching URL: {e}")
        return None

def parse_quiz_with_ai(content):
    """Uses Gemini AI to parse unstructured text into structured Quiz JSON"""
    if not GEMINI_API_KEY or "YOUR" in GEMINI_API_KEY:
        return {"error": "Gemini API Key not configured correctly"}

    prompt = f"""
    You are a quiz generator. Convert the following content into a valid JSON array of quiz questions.
    Each object MUST have:
    - "text": The question string
    - "option_a": Option A
    - "option_b": Option B
    - "option_c": Option C
    - "option_d": Option D
    - "correct_answer": One of 'A', 'B', 'C', 'D'

    Content:
    {content[:4000]}  # Limit content length
    """

    # Try different model names that might be available
    models_to_try = [
        'gemini-2.0-flash', 
        'gemini-1.5-flash', 
        'gemini-flash-latest', 
        'gemini-2.5-flash',
        'gemini-pro'
    ]
    
    last_error = ""
    for model_name in models_to_try:
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            
            if not response.text:
                continue

            # Extract JSON
            json_match = re.search(r'\[\s*\{.*\}\s*\]', response.text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(0))
            
            # Try parsing the whole thing as JSON
            return json.loads(response.text)
        except Exception as e:
            last_error = str(e)
            print(f"Failed with {model_name}: {e}")
            continue
            
    return {"error": f"AI Parsing failed with all models. Latest error: {last_error}"}
