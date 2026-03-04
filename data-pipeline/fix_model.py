"""Fix model name in config.py and test Vertex AI Vision"""
import vertexai
from vertexai.generative_models import GenerativeModel

vertexai.init(project="customs-guard-ai", location="us-central1")

# Try available models
models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-pro"]

for name in models:
    try:
        model = GenerativeModel(name)
        response = model.generate_content("Say hello in Thai, one word only.")
        print(f"  {name}: OK -> {response.text.strip()}")
    except Exception as e:
        err = str(e)[:100]
        print(f"  {name}: FAIL -> {err}")
