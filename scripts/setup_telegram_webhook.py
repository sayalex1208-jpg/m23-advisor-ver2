#!/usr/bin/env python3
"""
Setup and inspect the Telegram Webhook for M23 Cashew Advisor.
Usage:
    python3 scripts/setup_telegram_webhook.py [WEBHOOK_URL]

Examples:
    # Check current status:
    python3 scripts/setup_telegram_webhook.py

    # Set webhook to Vercel production:
    python3 scripts/setup_telegram_webhook.py https://m23-cashew-advisor.vercel.app/api/telegram

    # Delete webhook (e.g. for testing polling):
    python3 scripts/setup_telegram_webhook.py delete
"""

import sys
import os
import json
import urllib.request
import urllib.parse

def load_env_token():
    env_file = os.path.join(os.path.dirname(__file__), "..", ".env.local")
    if not os.path.exists(env_file):
        return None
    with open(env_file, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip().startswith("TELEGRAM_BOT_TOKEN="):
                val = line.strip().split("=", 1)[1].strip("\"' ")
                return val
    return None

def main():
    token = os.environ.get("TELEGRAM_BOT_TOKEN") or load_env_token()
    if not token:
        print("❌ Error: TELEGRAM_BOT_TOKEN not found in .env.local or environment.")
        sys.exit(1)

    base_url = f"https://api.telegram.org/bot{token}"

    # 1. Check getMe
    try:
        req = urllib.request.Request(f"{base_url}/getMe")
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            if data.get("ok"):
                bot = data["result"]
                print(f"🤖 Connected to bot: {bot.get('first_name')} (@{bot.get('username')}) [ID: {bot.get('id')}]")
            else:
                print(f"❌ getMe failed: {data}")
                sys.exit(1)
    except Exception as e:
        print(f"❌ Failed to reach Telegram API: {e}")
        sys.exit(1)

    # 2. Check current webhook
    try:
        req = urllib.request.Request(f"{base_url}/getWebhookInfo")
        with urllib.request.urlopen(req) as resp:
            wh_info = json.loads(resp.read().decode()).get("result", {})
            current_url = wh_info.get("url", "")
            print(f"📡 Current Webhook URL: {current_url or '(None - polling mode)'}")
            if wh_info.get("has_custom_certificate"):
                print("   Custom certificate: Yes")
            if wh_info.get("pending_update_count", 0) > 0:
                print(f"   Pending updates: {wh_info.get('pending_update_count')}")
            if wh_info.get("last_error_message"):
                print(f"   ⚠️ Last error: {wh_info.get('last_error_message')} at {wh_info.get('last_error_date')}")
    except Exception as e:
        print(f"❌ Failed to get webhook info: {e}")

    # 3. Handle setting/deleting webhook if argument provided
    if len(sys.argv) > 1:
        target = sys.argv[1].strip()
        if target.lower() == "delete":
            print("\n⏳ Removing webhook...")
            del_url = f"{base_url}/deleteWebhook?drop_pending_updates=true"
            req = urllib.request.Request(del_url)
            with urllib.request.urlopen(req) as resp:
                res = json.loads(resp.read().decode())
                print("✅ Webhook deleted:", res)
        else:
            print(f"\n⏳ Setting webhook to: {target} ...")
            post_data = urllib.parse.urlencode({
                "url": target,
                "drop_pending_updates": "true",
                "allowed_updates": json.dumps(["message", "callback_query"])
            }).encode()
            req = urllib.request.Request(f"{base_url}/setWebhook", data=post_data)
            with urllib.request.urlopen(req) as resp:
                res = json.loads(resp.read().decode())
                if res.get("ok"):
                    print("🎉 Webhook successfully configured!")
                    print(f"   Telegram will now forward updates to: {target}")
                else:
                    print("❌ Failed to set webhook:", res)

if __name__ == "__main__":
    main()
