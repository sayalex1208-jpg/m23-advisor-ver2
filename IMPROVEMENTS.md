# M23 Cashew Advisor — Immediate Improvements (Nov 2, 2026)

## Changes Made

### 1. **Enhanced Rate Limiting** ✅
**Problem:** In-memory rate limiter doesn't work across multiple Vercel serverless instances.

**Fix:**
- Added separate rate limits for photos (10 per 10 min) vs regular requests (30 per 10 min)
- Added automatic memory cleanup to prevent leaks
- Improved error messages
- **Files changed:** `api/_lib/advisor.ts`, `api/advisor.ts`

**Still TODO:** Replace with Redis/Upstash for production multi-instance deployment.

---

### 2. **Better Offline Photo Messaging** ✅
**Problem:** When offline, camera button was just disabled with no clear explanation.

**Fix:**
- Added visible offline banner: "គ្មានអ៊ីនធឺណិត — មគ្គុទ្ទេសក៍... នៅតែប្រើបាន · Offline — answers from book only, no photo checks"
- Improved button tooltip to clearly state internet requirement
- Changed cursor to not-allowed when disabled
- **Files changed:** `src/components/AskScreen.tsx`

---

### 3. **Clearer Photo Diagnosis Scope** ✅
**Problem:** Welcome text promised to "check for problems" on any photo, but only 8 conditions are recognized.

**Fix:**
- Changed Khmer text to: "ថតរូបស្លឹក ផ្កា ឬផ្លែ ដើម្បីរកបញ្ហា ៨ប្រភេទដែលមានក្នុងសៀវភៅ។"
- English: "Take a photo to check for 8 documented pests and diseases."
- Sets accurate expectations upfront
- **Files changed:** `src/components/AskScreen.tsx`

---

### 4. **Photo File Size Validation** ✅
**Problem:** Huge photos (20MB+) would timeout with no user feedback.

**Fix:**
- Added 25MB file size limit with immediate feedback
- Validates file is actually an image
- Shows bilingual error: "រូបភាពធំពេក សូមថតម្ដងទៀតក្នុងគុណភាពទាប · Photo too large, retake in lower quality"
- **Files changed:** `src/lib/image.ts`, `src/components/AskScreen.tsx`

---

### 5. **Registration Incentive** ✅
**Problem:** Farmers had no reason to register vs continuing as guest.

**Fix:**
- Added prominent benefit callout: "ចុះឈ្មោះឥឡូវ ទទួលបានគំរោងប្រើថ្នាំពិសេស · Register now, get custom spray calendar"
- Displayed in brand-colored box above register button
- **Files changed:** `src/components/Welcome.tsx`

---

## Priority Remaining Improvements

### High Priority (Before Production Launch)

**6. Replace Rate Limiter with Redis**
- Current in-memory limiter won't work with multiple Vercel instances
- Use Upstash Redis (free tier) or Vercel KV
- Estimate: 1-2 hours

**7. Database Schema Versioning**
- Create SQL migration files for Supabase tables
- Document schema: `farmers`, `spray_logs`, `harvest_logs`, `inquiries`
- Use Supabase CLI migrations
- Estimate: 2-3 hours

**8. Voice Input Visual Feedback**
- Add full-screen modal when listening (not just small text)
- Show waveform animation
- Bigger "stop" button
- Estimate: 2 hours

---

### Medium Priority (Usability for Low-Literacy Farmers)

**9. Icon-Based Navigation**
- Add color-coded icons to tab bar: 🗓️ 💬 📖 🌳
- Test that icons work without reading text
- Estimate: 1 hour

**10. Photo-First Questions**
- On Ask screen welcome, show 4 tappable photo cards:
  - Spotted leaf
  - Wilted flowers  
  - Cracked fruit
  - Healthy tree
- Farmer taps photo → instant question sent
- Estimate: 3 hours

**11. Khmer Numeral Display**
- Use `toKhmerDigits()` for all numeric inputs
- Hectares, tree age, spray amounts
- Make toggle for farmers who prefer Western digits
- Estimate: 2 hours

**12. Custom Date Picker**
- Replace native `<input type="date">` with Khmer month names
- Avoid English month names on Khmer-locale Android
- Estimate: 4-5 hours

---

### Lower Priority (Polish)

**13. Success Animations**
- After logging spray/harvest, show full-screen ✓ with confetti
- Summary card: "អ្នកបានចុះបញ្ជីការចាក់ថ្នាំ ថ្ងៃទី ២៥ មករា"
- Big "យល់ព្រម · OK" button
- Estimate: 2 hours

**14. Multi-Farmer Mode**
- "ប្តូរអ្នកប្រើ · Switch farmer" for shared phones
- Store multiple profiles in localStorage
- Quick-switch without logout
- Estimate: 3-4 hours

**15. AI Answer Length Control**
- Post-process Gemini responses to max 500 chars
- Append "... (សូមសួរបន្ថែម · ask for more)" if truncated
- Estimate: 1 hour

**16. Simplified Installation Hints**
- Replace text instructions with animated GIF
- Or add "បើកក្នុង Safari" button using iOS universal link
- Estimate: 2-3 hours

---

## Testing Checklist

Before launching to real farmers:

- [ ] Test rate limiting with multiple IPs
- [ ] Verify photo upload on 2G/3G connection
- [ ] Test with Khmer-locale Android phone (date picker)
- [ ] Test voice input/output on low-end devices
- [ ] Verify offline mode works (service worker caching)
- [ ] Test registration flow on both iOS and Android
- [ ] Check Telegram bot receives same answers as web
- [ ] Verify database backup/restore works
- [ ] Load test with 50 concurrent photo diagnoses
- [ ] Test installation from Facebook/Messenger in-app browser

---

## Architecture Notes

### Current Deployment
- **Web:** Vercel serverless (main production)
- **Database:** Supabase PostgreSQL
- **AI:** Google Gemini (`gemini-3.5-flash-lite`)
- **Bot:** Python scripts (polling for dev, webhook for prod)

### Known Limitations
1. **Khmer calendar:** Uses fixed Gregorian-to-lunar mapping (approximate, not astronomically accurate)
2. **Photo diagnosis:** Only 8 conditions recognized; anything else gets "ask an agronomist" response
3. **Context passing:** Farm details only appended to latest turn, not full conversation history
4. **Rate limiting:** Per-instance only; bypassed by cold starts

### Success Metrics to Track
- Registration rate (goal: >60% register vs guest)
- Photo diagnosis usage (goal: >5 photos per registered farmer)
- Voice input adoption (goal: >30% of questions)
- Return visits (goal: >3 sessions per week during growing season)
- Feedback ratings (goal: >80% positive on AI answers)

---

**Built:** Nov 2, 2026  
**Next Review:** Before pilot launch with first 20 farmers
