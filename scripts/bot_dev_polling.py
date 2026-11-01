#!/usr/bin/env python3
"""
Local Telegram Bot Polling Bridge for Development
Allows testing @cambodia_cashew_advisor_bot locally without deploying to Vercel.

Usage:
  1. In terminal 1: npm run dev
  2. In terminal 2: python3 scripts/bot_dev_polling.py
"""

import sys
import os
import json
import time
import urllib.request
import urllib.error

def load_env_token():
    env_file = os.path.join(os.path.dirname(__file__), "..", ".env.local")
    if not os.path.exists(env_file):
        return None
    with open(env_file, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip().startswith("TELEGRAM_BOT_TOKEN="):
                return line.strip().split("=", 1)[1].strip("\"' ")
    return None

def main():
    token = os.environ.get("TELEGRAM_BOT_TOKEN") or load_env_token()
    if not token:
        print("❌ TELEGRAM_BOT_TOKEN not found in .env.local")
        sys.exit(1)

    tg_base = f"https://api.telegram.org/bot{token}"
    local_api = os.environ.get("LOCAL_API_URL", "http://localhost:5173/api/telegram")

    # Clear any webhook so getUpdates works
    try:
        del_req = urllib.request.Request(f"{tg_base}/deleteWebhook?drop_pending_updates=false")
        urllib.request.urlopen(del_req)
    except Exception as e:
        print(f"⚠️ Note on deleteWebhook: {e}")

    # Fetch bot info
    try:
        info_req = urllib.request.Request(f"{tg_base}/getMe")
        with urllib.request.urlopen(info_req) as resp:
            bot = json.loads(resp.read().decode())["result"]
            print(f"🚀 Bot connected: {bot['first_name']} (@{bot['username']})")
            print(f"📡 Forwarding Telegram updates to local dev server: {local_api}")
            print(f"👉 You can now open Telegram and message @{bot['username']} to test!")
            print("Press Ctrl+C to stop.\n")
    except Exception as e:
        print(f"❌ Could not connect to Telegram: {e}")
        sys.exit(1)

    offset = 0
    while True:
        try:
            url = f"{tg_base}/getUpdates?offset={offset}&timeout=25"
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode())
                updates = data.get("result", [])

                for update in updates:
                    offset = max(offset, update["update_id"] + 1)
                    
                    msg = update.get("message", {})
                    sender = msg.get("from", {}).get("first_name", "User")
                    text = msg.get("text") or (msg.get("photo") and "[Photo]") or "[Other]"
                    print(f"📥 Received from {sender}: {text}")

                    # Forward to local API endpoint
                    try:
                        forward_req = urllib.request.Request(
                            local_api,
                            data=json.dumps(update).encode("utf-8"),
                            headers={"Content-Type": "application/json"},
                            method="POST"
                        )
                        with urllib.request.urlopen(forward_req, timeout=60) as fwd_resp:
                            res_body = fwd_resp.read().decode()
                            print(f"   ↳ Handled by local API (HTTP {fwd_resp.status})")
                    except urllib.error.URLError as err:
                        print(f"   ❌ Failed to forward to {local_api}: {err}")
                        print("      (Make sure 'npm run dev' is running in another terminal!)")

        except KeyboardInterrupt:
            print("\n👋 Stopping local polling.")
            break
        except Exception as e:
            # Sleep briefly on network error before retrying
            time.sleep(2)

if __name__ == "__main__":
    main()
