# /backend/main.py

import os
import json
import socketio
import yt_dlp
import google.generativeai as genai
import base64
from io import BytesIO
from PIL import Image
from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# --- CONFIGURATION ---
load_dotenv() # Loads environment variables from a .env file
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("Error: GOOGLE_API_KEY environment variable not set!")
genai.configure(api_key=GOOGLE_API_KEY)

# --- INITIALIZATION ---
app = FastAPI(title="Flow Reality Co-Pilot Backend")
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
socket_app = socketio.ASGIApp(sio)
app.mount("/socket.io", socket_app) # Mount Socket.IO app

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

# --- IN-MEMORY STORAGE (for Hackathon/Demo) ---
guidance_model_cache = {}
session_memory = {}

# --- DATA MODELS ---
class UrlPayload(BaseModel):
    url: str

# --- REST ENDPOINT: PHASE 0 (Ingestion) ---
@app.post("/ingest")
async def ingest_url(payload: UrlPayload):
    url = payload.url
    print(f"Received URL to ingest: {url}")

    if url in guidance_model_cache:
        print("Found in cache.")
        return {"status": "cached", "model_id": url, "data": json.loads(guidance_model_cache[url])}
    
    try:
        # 1. Get Transcript using yt-dlp
        # This downloads the subtitle file to the local directory
        subtitle_file = f'subtitle.en.vtt'
        if os.path.exists(subtitle_file):
            os.remove(subtitle_file) # Clean up old file
        
        ydl_opts = {'writesubtitles': True, 'subtitleslangs': ['en'], 'skip_download': True, 'outtmpl': 'subtitle'}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        
        # Read the downloaded subtitle file
        with open(subtitle_file, 'r') as f:
            transcript_text = f.read()
        os.remove(subtitle_file) # Clean up after reading
        
        # 2. Call Gemini to create the Guidance Model
        print("Generating Guidance Model with Gemini...")
        model = genai.GenerativeModel('gemini-1.5-pro-latest')
        prompt = f"""
        You are an AI Instructional Design expert. Analyze this YouTube transcript for a recipe or task. Create a detailed JSON 'Guidance Model'. For each distinct action, create a JSON object with keys: `step_id`, `creator_instruction`, `goal_outcome`, `visual_benchmarks` (array of strings), and `creator_tips` (array of strings). Your analysis must be meticulous.

        Transcript:
        {transcript_text}
        """
        response = await model.generate_content_async(prompt)
        
        # Clean and parse the JSON response from Gemini
        json_string = response.text.replace("```json", "").replace("```", "").strip()
        guidance_model = json.loads(json_string)

        # 3. Cache and return
        guidance_model_cache[url] = json.dumps(guidance_model)
        print("Guidance Model created and cached.")
        return {"status": "created", "model_id": url, "data": guidance_model}

    except Exception as e:
        print(f"An error occurred during ingestion: {e}")
        return {"status": "error", "message": str(e)}

# --- SOCKET.IO HANDLERS: PHASE 1 (Real-time Loop) ---
@sio.on('connect')
def connect(sid, environ):
    print(f'Socket.IO connected: {sid}')
    session_memory[sid] = {'current_step': 0, 'match_streak': 0}

@sio.on('start_session')
async def start_session(sid, data):
    session_memory[sid]['model_id'] = data['model_id']
    print(f"Session started for {sid} with model_id: {data['model_id']}")

@sio.on('process_frame')
async def process_frame(sid, data):
    try:
        session = session_memory.get(sid)
        if not session or 'model_id' not in session:
            return

        # 1. Retrieve Step Context
        model_id = session['model_id']
        guidance_model = json.loads(guidance_model_cache[model_id])
        step_id = session['current_step']
        current_step_context = guidance_model[step_id]

        # 2. Call Gemini Comparative Coach
        model = genai.GenerativeModel('gemini-1.5-pro-latest')
        image_b64 = data['image']
        image_data = base64.b64decode(image_b64.split(',')[1])
        image = Image.open(BytesIO(image_data))

        prompt = f"""
        System: You are 'Flow,' an AI coach. Compare the user's action in the image to the creator's instructions below. Respond ONLY with JSON: {{"is_match": boolean, "feedback": "Your short, helpful tip referencing the creator's advice."}}

        Context:
        - Creator's Instruction: "{current_step_context['creator_instruction']}"
        - Goal: "{current_step_context['goal_outcome']}"
        - Creator's Tip: "{', '.join(current_step_context['creator_tips'])}"
        """
        
        response = await model.generate_content_async([prompt, image])
        feedback_json = json.loads(response.text.replace("```json", "").replace("```", "").strip())
        
        # 3. Emit feedback and manage state
        if feedback_json.get('feedback'):
            await sio.emit('new_feedback', {'text': feedback_json['feedback'], 'step': step_id + 1}, room=sid)

        if feedback_json.get('is_match'):
            session['match_streak'] += 1
            if session['match_streak'] >= 2 and (session['current_step'] < len(guidance_model) - 1):
                session['current_step'] += 1
                session['match_streak'] = 0
                next_step_instruction = guidance_model[session['current_step']]['creator_instruction']
                await sio.emit('next_step', {'instruction': next_step_instruction, 'step': session['current_step'] + 1}, room=sid)
        else:
            session['match_streak'] = 0 # Reset streak on mismatch
    
    except Exception as e:
        print(f"Error processing frame for {sid}: {e}")
        
@sio.on('disconnect')
def disconnect(sid):
    print(f'Socket.IO disconnected: {sid}')
    session_memory.pop(sid, None)

# Health check endpoint
@app.get("/")
def read_root():
    return {"status": "Flow Backend is running"}