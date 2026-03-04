"""Patch config.py to use working model names"""
import re

with open("config.py", "r") as f:
    content = f.read()

# Fix vision model
content = re.sub(
    r'VERTEX_VISION_MODEL\s*=\s*"[^"]*"',
    'VERTEX_VISION_MODEL = "gemini-2.5-flash"',
    content,
)

# Fix flash model (already correct but ensure)
content = re.sub(
    r'VERTEX_FLASH_MODEL\s*=\s*"[^"]*"',
    'VERTEX_FLASH_MODEL = "gemini-2.5-flash"',
    content,
)

with open("config.py", "w") as f:
    f.write(content)

print("config.py updated:")
print("  VERTEX_VISION_MODEL = gemini-2.5-flash")
print("  VERTEX_FLASH_MODEL = gemini-2.5-flash")
