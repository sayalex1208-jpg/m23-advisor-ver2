# Collect feedback and sign-ups in a Google Sheet

The app sends two kinds of feedback to `/api/feedback`:

- **rating**: a farmer tapped 👍 or 👎 on an answer (AI, book or photo)
- **no_answer**: a question the book couldn't answer surely, which shows what to add to the next knowledge base. When the app offered "Is it one of these?" choices instead, their entry numbers are in the entry IDs column

Sign-ups from the welcome screen (`/api/register`: name, phone, village, after the farmer ticks the consent box) go to the same script and land on a **Farmers** tab, which the script creates.

Feedback sends no farm details or location: only the question, the answer, the rating and the knowledge base entry numbers.

Until a sheet is connected, feedback only appears in Vercel's function logs, which the free plan keeps for a short time. Connecting a sheet takes about 5 minutes and is free.

## 1. Make the sheet

Create a new Google Sheet, for example "M23 Cashew Advisor feedback". The script below adds the header row itself the first time feedback arrives.

## 2. Add the script

1. In the sheet: **Extensions → Apps Script**.
2. Replace the code with:

```js
/** @OnlyCurrentDoc */

// Text starting with = + - @ would run as a formula; store it as plain text.
function safe(s) {
  s = String(s == null ? "" : s);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  const book = SpreadsheetApp.getActiveSpreadsheet();

  if (d.kind === "register") {
    const farmers = book.getSheetByName("Farmers") || book.insertSheet("Farmers", book.getNumSheets());
    if (farmers.getLastRow() === 0) {
      farmers.appendRow(["Registered (UTC)", "Name", "Phone", "Village or commune"]);
      farmers.setFrozenRows(1);
      farmers.getRange(1, 1, 1, 4).setFontWeight("bold");
    }
    farmers.appendRow([d.at, safe(d.name), "'" + d.phone, safe(d.village)]);
    return ContentService.createTextOutput("ok");
  }

  const sheet = book.getSheets()[0];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["When (UTC)", "Kind", "Rating", "Source", "Book entries", "Question", "Answer"]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 7).setFontWeight("bold");
  }
  sheet.appendRow([
    d.at, d.kind, d.rating || "", d.source,
    (d.entryIds || []).join(", "), safe(d.question), safe(d.answer),
  ]);
  return ContentService.createTextOutput("ok");
}
```

3. **Deploy → New deployment → Web app**. Set **Execute as: Me** and **Who has access: Anyone**, then **Deploy** and allow access.
   School and company Google accounts often hide the "Anyone" option. If you only see "Anyone within [your school]", make the sheet in a personal Gmail account instead; the app's server is outside your school, so it can't reach a school-only script.
4. Copy the **Web app URL** (it ends in `/exec`).

## 3. Connect it to the app

1. In Vercel: open the `m23-cashew-advisor` project → **Settings → Environment Variables**.
2. Add `FEEDBACK_WEBHOOK_URL` with the URL from step 2, for Production.
3. Redeploy: `npx vercel deploy --prod`.

Tap 👍 on any answer in the app; a row appears in the sheet within a few seconds.

## Updating the script later

After changing the code: **Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy**. Editing the existing deployment keeps the same URL, so nothing changes in Vercel.
