from google import genai

client = genai.Client(api_key="GOOGLE_API_KEY")import os
import time
import argparse
from typing import Optional, Dict, Any
from dotenv import load_dotenv
import json
from datetime import datetime

# Import Google GenAI SDK
from google import genai

myfile = client.files.upload(file="/Users/pranavharshans/All-proj/video-summary/videoplayback.mp4")

response = client.models.generate_content(
    model="gemini-2.0-flash", contents=[myfile, "Summarize this video. Then create a quiz with an answer key based on the information in this video."]
)

print(response.text)
