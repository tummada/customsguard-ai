"""
Collector: ecs-support.github.io — Customs Department announcements

This is a GitHub Pages site with clean HTML — can git clone the entire repo.
Contains structured announcements spanning multiple years.

Provenance: source_url = https://ecs-support.github.io/post/law/customs/{year}/{year}-{number}/
"""

import os
import json
import subprocess
import glob as glob_mod

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config import RAW_DIR

REPO_URL = "https://github.com/ecs-support/ecs-support.github.io.git"
OUTPUT_DIR = os.path.join(RAW_DIR, "ecs-regulations")
CLONE_DIR = os.path.join(OUTPUT_DIR, "repo")
BASE_URL = "https://ecs-support.github.io"


def clone_or_pull():
    """Clone the repo or pull latest if already cloned."""
    if os.path.exists(os.path.join(CLONE_DIR, ".git")):
        print("[ecs] Repo already cloned, pulling latest...")
        subprocess.run(
            ["git", "pull", "--ff-only"],
            cwd=CLONE_DIR,
            capture_output=True,
            timeout=120,
        )
    else:
        print(f"[ecs] Cloning {REPO_URL}...")
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        # Shallow clone to save space/time
        subprocess.run(
            ["git", "clone", "--depth", "1", REPO_URL, CLONE_DIR],
            capture_output=True,
            timeout=300,
        )
    print(f"[ecs] Repo at {CLONE_DIR}")


def find_regulation_posts() -> list[dict]:
    """Find all regulation/law posts in the cloned repo."""
    posts = []

    # Look for posts in _posts/ or content/ directories
    search_patterns = [
        os.path.join(CLONE_DIR, "_posts", "**", "*.md"),
        os.path.join(CLONE_DIR, "_posts", "**", "*.html"),
        os.path.join(CLONE_DIR, "content", "**", "*.md"),
        os.path.join(CLONE_DIR, "content", "**", "*.html"),
        os.path.join(CLONE_DIR, "post", "**", "*.md"),
        os.path.join(CLONE_DIR, "post", "**", "*.html"),
    ]

    found_files = set()
    for pattern in search_patterns:
        for fpath in glob_mod.glob(pattern, recursive=True):
            found_files.add(fpath)

    print(f"[ecs] Found {len(found_files)} post files")

    for fpath in sorted(found_files):
        rel_path = os.path.relpath(fpath, CLONE_DIR)

        # Derive URL from file path
        # e.g. _posts/law/customs/2567/2567-116.md → /post/law/customs/2567/2567-116/
        url_path = rel_path
        for prefix in ("_posts/", "content/", "post/"):
            if url_path.startswith(prefix):
                url_path = url_path[len(prefix):]
                break
        # Remove file extension
        url_path = os.path.splitext(url_path)[0]
        source_url = f"{BASE_URL}/post/{url_path}/"

        posts.append({
            "local_path": fpath,
            "relative_path": rel_path,
            "source_url": source_url,
        })

    return posts


def collect():
    """Main entry point: clone repo and index all regulation posts."""
    clone_or_pull()

    posts = find_regulation_posts()

    # Save manifest
    manifest_path = os.path.join(OUTPUT_DIR, "_manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(posts, f, ensure_ascii=False, indent=2)

    print(f"\n[ecs] Indexed {len(posts)} regulation posts")
    print(f"[ecs] Manifest saved to {manifest_path}")
    return posts


if __name__ == "__main__":
    collect()
