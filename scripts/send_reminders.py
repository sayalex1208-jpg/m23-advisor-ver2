#!/usr/bin/env python3
"""
M23 Cashew Advisor — Proactive Reminder Runner
Queries active farmers in Supabase and sends scheduled agricultural & spray reminders
directly to their Telegram chat via push notification.
"""

import os
import json
import urllib.request
import urllib.parse
from datetime import datetime

def load_env():
    env = {}
    env_file = os.path.join(os.path.dirname(__file__), "..", ".env.local")
    if os.path.exists(env_file):
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if "=" in line and not line.startswith("#"):
                    k, v = line.split("=", 1)
                    env[k.strip()] = v.strip().strip("\"' ")
    return env

def main():
    env = load_env()
    token = env.get("TELEGRAM_BOT_TOKEN")
    supabase_url = env.get("SUPABASE_URL")
    supabase_key = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("SUPABASE_ANON_KEY")

    if not token or not supabase_url or not supabase_key:
        print("❌ Missing required environment variables in .env.local")
        return

    # 1. Fetch active farmers from Supabase
    req_url = f"{supabase_url}/rest/v1/farmers?telegram_id=not.is.null&select=id,name_km,telegram_id,telegram_username,province,tree_age_years"
    req = urllib.request.Request(req_url, headers={
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}"
    })

    try:
        with urllib.request.urlopen(req) as resp:
            farmers = json.loads(resp.read().decode())
    except Exception as e:
        print(f"❌ Failed to query farmers from Supabase: {e}")
        return

    print(f"📋 Found {len(farmers)} active farmers in database.")

    # Current month (1-12)
    current_month = datetime.now().month

    for f in farmers:
        tg_id = f.get("telegram_id")
        name = f.get("name_km") or f.get("telegram_username") or "កសិករ"
        age = f.get("tree_age_years")
        prov = f.get("province") or "ចម្ការរបស់អ្នក"

        age_text = f"ដើមអាយុ <b>{age} ឆ្នាំ</b>" if age else "ដំណាំស្វាយចន្ទី"

        # Build personalized reminder message
        msg = (
            f"⏰ <b>ការរំលឹកកិច្ចការចម្ការស្វាយចន្ទី (Proactive Reminder)</b>\n\n"
            f"សួស្តីបង <b>{name}</b>! 🌾\n"
            f"ក្នុងខែវិច្ឆិកានេះ {age_text} នៅ{prov} កំពុងឈានចូលដំណាក់កាល <b>ចេញកញ្ចុំផ្កា (Panicles emerging)</b> ហើយ។\n\n"
            f"<b>⚠️ កិច្ចការបន្ទាន់ត្រូវធ្វើក្នុងសប្តាហ៍នេះ៖</b>\n"
            f"• <b>កម្ចាត់សត្វមមាចមូស & ទ្រីប៖</b> ត្រួតពិនិត្យមើលត្រួយ និងកញ្ចុំផ្កាខ្ចីជាប្រចាំ\n"
            f"• <b>ការពារផ្សិតអង់ត្រាក់ណូស៖</b> ត្រូវបាញ់ថ្នាំការពារ <b>មុនពេលផ្ការីក</b> (កុំបាញ់ពេលផ្ការីកស្គុះ)\n"
            f"• <b>ពេលវេលាសុវត្ថិភាព៖</b> បាញ់នៅម៉ោង ១ រសៀលឡើងទៅ ដើម្បីកុំឱ្យងាប់ឃ្មុំក្រេបលម្អង\n\n"
            f"<i>តើបងបានត្រួតពិនិត្យ ឬបាញ់ថ្នាំការពាររួចរាល់ហើយឬនៅ?</i>"
        )

        buttons = {
            "inline_keyboard": [
                [
                    {"text": "✅ បានបាញ់ថ្នាំការពាររួច", "callback_data": "log_spray:fungus:anthracnose_prebloom"},
                    {"text": "🗓️ មើលកិច្ចការខែនេះ", "callback_data": "cmd_today"}
                ]
            ]
        }

        # Send push notification to Telegram
        send_url = f"https://api.telegram.org/bot{token}/sendMessage"
        payload = json.dumps({
            "chat_id": tg_id,
            "text": msg,
            "parse_mode": "HTML",
            "reply_markup": buttons
        }).encode("utf-8")

        try:
            tg_req = urllib.request.Request(
                send_url,
                data=payload,
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(tg_req) as tg_resp:
                res = json.loads(tg_resp.read().decode())
                if res.get("ok"):
                    print(f"✅ Sent reminder successfully to {name} (Telegram ID: {tg_id})")
                else:
                    print(f"❌ Failed to send to {name}: {res}")
        except Exception as e:
            print(f"❌ Error sending to {tg_id}: {e}")

if __name__ == "__main__":
    main()
