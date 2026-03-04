"""Test Vertex AI embedding access"""
import google.auth
import google.auth.transport.requests
import requests

c, _ = google.auth.default()
c.refresh(google.auth.transport.requests.Request())
r = requests.post(
    "https://us-central1-aiplatform.googleapis.com/v1beta1/projects/customs-guard-ai/locations/us-central1/publishers/google/models/gemini-embedding-001:predict",
    headers={"Authorization": f"Bearer {c.token}"},
    json={"instances": [{"content": "test"}], "parameters": {"outputDimensionality": 768}},
)
print(r.status_code)
print(r.text[:500])
