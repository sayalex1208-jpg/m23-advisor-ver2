# System Architecture — M23 Cashew Advisor + Telegram Bot

---

## Big Picture — How Everything Connects

```mermaid
flowchart TD
    subgraph FARMERS["👨‍🌾 Farmers"]
        F1["Farmer A\n(Telegram)"]
        F2["Farmer B\n(Browser / PWA)"]
    end

    subgraph TELEGRAM["📱 Telegram Platform"]
        TG["Telegram Servers\n(free, runs 24/7)"]
    end

    subgraph VERCEL["☁️ Vercel (your current host)"]
        WEBHOOK["Bot Webhook\n/api/telegram\nnew file"]
        WEBAPI["Web API Routes\n/api/ask  /api/diagnose\nalready exist"]
        PWA["React PWA\nm23-cashew-advisor.vercel.app\nalready exists"]
    end

    subgraph SUPABASE["🗄️ Supabase (your current DB)"]
        FARMERDB["farmers table\ntelegram_id, name, tree_age,\nprovince, hectares"]
        SPRAYDB["spray_logs table\nfarmer_id, date, type, done"]
        SCHEDULER["Edge Function\nReminderScheduler\nruns daily at 6am"]
    end

    subgraph AI["🤖 AI — Google Gemini"]
        GEMINI["Gemini API\nText Q&A + Photo Diagnosis\nalready wired up"]
    end

    subgraph KB["📚 Knowledge Base"]
        KBJSON["kb-v2.json\n123 verified entries\nalready exists"]
    end

    F1 -->|"types question\nor sends 📷 photo"| TG
    TG -->|"webhook POST"| WEBHOOK
    WEBHOOK -->|"calls"| WEBAPI
    WEBAPI -->|"prompt + KB"| GEMINI
    GEMINI -->|"Khmer answer"| WEBAPI
    WEBAPI -->|"structured reply"| WEBHOOK
    WEBHOOK -->|"sends message back"| TG
    TG -->|"delivers reply"| F1

    WEBHOOK <-->|"read/write farm profile\n& spray logs"| FARMERDB
    WEBHOOK <-->|"log sprays\nmark DONE"| SPRAYDB

    SCHEDULER -->|"checks who needs\na reminder today"| SPRAYDB
    SCHEDULER -->|"looks up farm profile"| FARMERDB
    SCHEDULER -->|"sends reminder message"| TG

    F2 -->|"opens URL"| PWA
    PWA -->|"calls"| WEBAPI
    PWA <-->|"reads/writes"| FARMERDB
    PWA <-->|"reads/writes"| SPRAYDB

    WEBAPI -->|"uses"| KBJSON
```

---

## Zoom In — What Happens When a Farmer Messages the Bot

```mermaid
sequenceDiagram
    participant F as 👨‍🌾 Farmer
    participant TG as Telegram
    participant WH as Webhook /api/telegram
    participant DB as Supabase
    participant AI as Gemini API

    F->>TG: Types question in Khmer
    TG->>WH: POST /api/telegram (message JSON)

    WH->>DB: Look up farmer by telegram_id
    alt First time user
        DB-->>WH: Not found
        WH->>TG: "Welcome! How old are your trees?"
        TG->>F: Question sent
    else Known farmer
        DB-->>WH: Farm profile (age, province, hectares)
        WH->>AI: Question + farm context + KB prompt
        AI-->>WH: Structured Khmer answer
        WH->>TG: Send reply to farmer
        TG->>F: Answer delivered 📩
    end
```

---

## Zoom In — How Reminders Work

```mermaid
sequenceDiagram
    participant CRON as ⏰ Scheduler (6am daily)
    participant DB as Supabase
    participant TG as Telegram
    participant F as 👨‍🌾 Farmer

    CRON->>DB: What season is it? Who has trees at this stage?
    DB-->>CRON: [Farmer A: 6yr trees, Kampong Thom]\n[Farmer C: 4yr trees, Siem Reap]

    CRON->>DB: Has Farmer A already been reminded this week?
    DB-->>CRON: No

    CRON->>TG: Send spray reminder to Farmer A's telegram_id
    TG->>F: "🌸 Flowering season started!\nCheck if >80% buds open.\nReply DONE when sprayed ✅"

    F->>TG: DONE
    TG->>WH: POST /api/telegram ("DONE" message)
    WH->>DB: Mark spray log as completed, timestamp
    WH->>TG: "✅ Logged! Spray #3 saved for Oct 31.\nNext check-in: Nov 14."
    TG->>F: Confirmation delivered
```

---

## Data Model — What Gets Stored in Supabase

```mermaid
erDiagram
    FARMERS {
        uuid id PK
        text telegram_id UK
        text name_km
        int  tree_age_years
        text province
        float hectares
        date registered_at
    }

    SPRAY_LOGS {
        uuid id PK
        uuid farmer_id FK
        date scheduled_date
        text spray_type
        bool done
        date completed_at
        text notes_km
    }

    HARVEST_LOGS {
        uuid id PK
        uuid farmer_id FK
        int  season_year
        float kg_total
        float price_per_kg
        text notes_km
    }

    FARMERS ||--o{ SPRAY_LOGS : "has many"
    FARMERS ||--o{ HARVEST_LOGS : "has many"
```

---

## What's New vs. What Already Exists

```mermaid
flowchart LR
    subgraph EXISTS["✅ Already Built"]
        A["React PWA\n(web app)"]
        B["Gemini API\nintegration"]
        C["kb-v2.json\nknowledge base"]
        D["Supabase\nproject setup"]
        E["/api/ask\n/api/diagnose\nroutes"]
    end

    subgraph NEW["🆕 New to Build"]
        F["/api/telegram\nwebhot handler"]
        G["farmers table\nin Supabase"]
        H["spray_logs table\nin Supabase"]
        I["Reminder Scheduler\nEdge Function"]
        J["BotFather setup\n(2 min on Telegram)"]
    end

    EXISTS --> NEW
```

> [!NOTE]
> The new pieces **reuse** all your existing logic. The webhook just calls `/api/ask` and `/api/diagnose` the same way the web app does — it's a new *front door*, not a new brain.

---

## Farmer Journey — First Time vs. Returning

```mermaid
flowchart TD
    A["Farmer finds bot\n@M23CashewBot"] --> B{"First time?"}

    B -->|Yes| C["Bot asks 3 questions:\n1. Tree age?\n2. Province?\n3. Farm size ha?"]
    C --> D["Profile saved\nin Supabase"]
    D --> E["Bot confirms:\n✅ All set! I'll remind you\nwhen to spray & fertilize"]

    B -->|No| F["Farmer types question\nor sends photo"]

    E --> F
    F --> G{"What kind\nof message?"}

    G -->|"Text question"| H["AI answers\nfrom KB — in Khmer"]
    G -->|"📷 Photo"| I["Gemini diagnoses\npest or disease"]
    G -->|"/today"| J["Lists this month's\ntasks for their season"]
    G -->|"DONE"| K["Logs spray/task\nin Supabase"]

    H --> L["Reply sent\nto farmer"]
    I --> L
    J --> L
    K --> L
```

---

## Summary — One Line per Layer

| Layer | What it is | Status |
|---|---|---|
| **Telegram** | Delivery channel — free, runs itself | 🆕 Register bot (2 min) |
| **`/api/telegram`** | Webhook — receives messages, routes them | 🆕 ~100 lines of code |
| **`/api/ask` `/api/diagnose`** | AI routes — unchanged | ✅ Already done |
| **Gemini API** | AI brain — unchanged | ✅ Already done |
| **`kb-v2.json`** | Knowledge source — unchanged | ✅ Already done |
| **Supabase DB** | Stores farmer profiles + spray logs | 🆕 2 new tables |
| **Reminder Scheduler** | Daily Edge Function — sends proactive messages | 🆕 ~50 lines of code |
| **React PWA** | Full web app — unchanged | ✅ Already done |
