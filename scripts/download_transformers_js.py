#!/usr/bin/env python3
"""
Download the Transformers.js library for the Chrome extension.

This is a one-time setup step. The file is saved to extension/lib/ and
loaded by the extension's offscreen document to run ML inference in-browser.

Usage:
    uv run python scripts/download_transformers_js.py
"""
import os
import urllib.request

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUTPUT = os.path.join(ROOT, "extension", "lib", "transformers.min.js")
# Pinned version for reproducibility — update intentionally when upgrading
URL = "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js"


def main():
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    print(f"Downloading transformers.js v2.17.2...")

    def progress(block_num, block_size, total_size):
        downloaded = block_num * block_size
        if total_size > 0:
            pct = min(100, downloaded * 100 // total_size)
            print(f"\r  {pct}% ({downloaded // 1024} / {total_size // 1024} KB)", end="", flush=True)

    urllib.request.urlretrieve(URL, OUTPUT, reporthook=progress)
    print()

    size_kb = os.path.getsize(OUTPUT) // 1024
    print(f"Saved to extension/lib/transformers.min.js ({size_kb} KB)")
    print("\nSetup complete! Load the extension:")
    print("  chrome://extensions > Developer mode > Load unpacked > select extension/")


if __name__ == "__main__":
    main()
