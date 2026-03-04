"""Check if Gemini embedding quota has reset"""
import requests, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from config import GEMINI_API_KEY

url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key={GEMINI_API_KEY}"
r = requests.post(url, json={"content": {"parts": [{"text": "test"}]}, "outputDimensionality": 768})
print(f"Status: {r.status_code}")
if r.status_code == 200:
    print("READY! Quota reset แล้ว — รัน python3 03_embed_fast.py ได้เลย")
else:
    print(f"ยังไม่ reset: {r.text[:200]}")
