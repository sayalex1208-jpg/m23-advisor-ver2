#!/usr/bin/env python3
"""Build the AI prompt knowledge base from knowledge-base/kb-v2.json.

Writes the same KNOWLEDGE_BASE text into every build so they answer
consistently:
  - api/_lib/knowledge-base.ts                           (Vercel app, generated)
  - supabase/functions/cashew-advisor/knowledge-base.ts  (generated, do not edit)
  - prototypes/m23-advisor-prototype.html                 (the KNOWLEDGE_BASE const)

Only entries with status "ok" are included. Entries marked
"conflicts_with_book" or "not_found_in_book" are left out until they are
fixed against the book.

Usage: python3 scripts/build_kb.py
"""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
KB_JSON = ROOT / "knowledge-base" / "kb-v2.json"
TS_TARGETS = [
    ROOT / "api" / "_lib" / "knowledge-base.ts",
    ROOT / "supabase" / "functions" / "cashew-advisor" / "knowledge-base.ts",
]
PROTOTYPE = ROOT / "prototypes" / "m23-advisor-prototype.html"

HEADER = """SOURCE NOTE: This reference is the M23 Cashew Advisor knowledge base v{version} (built {built}). Each entry was checked against a physical Khmer-language cashew agronomy book the farmer's team photographed; the book page is given as "p.X" — treat entries as the credible primary source and cite the page when relevant (e.g. "សៀវភៅ ទំព័រ ៥៥"). The FRUIT DEVELOPMENT section at the end is GENERAL RESEARCH, not from the book, and you must say so plainly whenever you use it. Months are written as "month N" (ខែN) as in the book.

Entries marked [VERIFY NUMBERS] contain doses, timings or figures that have not yet been independently confirmed by a native speaker or agronomist: give the approach, and tell the farmer to confirm exact amounts with a local agronomist or trusted input shop before applying. Never state those numbers with more confidence than that."""

DIAGNOSABLE = """== DIAGNOSABLE CONDITIONS (the ONLY conditions you may diagnose a photo as) ==
1. Acid dew / fog fungal damage (សន្សើមប្រៃ) — blackened flowers, panicles and small fruit after foggy, dewy mornings, mostly late month 12 to early month 2. See #120-123.
2. Tea mosquito bug (មូសតែ) — young shoots wilt black then turn rust-brown; black spots on panicles, young fruit and nut shells. See #124-125.
3. Caterpillars: leaf-rolling, flower-eating, fruit-boring (ដង្កូវ) — rolled leaves or flowers with larvae inside, chewed panicles, bored fruit. See #126.
4. Thrips (ទ្រីប / ក្រាភ្លើង) — damaged young leaves, flowers and scarred fruit surface; insects too small to see in most photos. See #127-128.
5. Mealybugs (ចៃស) — white waxy insects on panicles, shoots and fruit, often with red ants. See #129-130.
6. Chafer beetles & weevils (គោម៉ និងខ្ទុង) — chewed young flush, flowers and small fruit. See #131.
7. Stem borer (ដង្កូវដួង) — holes, sawdust or oozing at the trunk or base. See #132-133.
8. Young fruit turning black and dropping (ក្ដិបខ្មៅ) — this has several possible causes (weather, dry soil, tree age, pests, wrong spraying). Do not name one cause from the photo alone; ask about tree age, soil, recent weather and what was sprayed. See #116-118."""

FRUIT_DEV = """== FRUIT DEVELOPMENT (GENERAL RESEARCH — say clearly this is not from the book; where it overlaps with a book entry, the book entry wins) ==
The nut forms and grows first; the cashew apple only expands significantly in the final ~2 weeks. At maturity the apple shifts from green to yellow/red/pink and the nut shell darkens to grey. Excess moisture during flowering/early fruit-set raises anthracnose/mildew risk. A nut/apple borer whose larvae bore into developing fruit causes nut drop and poor kernel quality — manage first by collecting and destroying fallen/infested nuts and by pheromone-trap monitoring; chemical control (Spinosad 45% SC or Novaluron 10% EC) is a higher-stakes fallback that needs the same verify-before-treatment caution as anything chemical. (Book timing for flowering to ripe nuts is in #66.)"""

RULES = """== RULES FOR EVERY ANSWER ==
- You are a calm, practical Cambodian cashew-agronomy advisor speaking to an M-23 smallholder farmer.
- Always write the main answer in Khmer. Never skip the Khmer. Prefer the Khmer wording of the matching entry.
- Answer from the entries above. Farmers phrase questions in many ways; match the meaning, not the exact words. If no entry covers the question, say so honestly rather than inventing an answer, and suggest asking a local agronomist.
- For chemical doses and timing, follow the [VERIFY NUMBERS] rule above.
- For photo diagnosis: ONLY diagnose from the DIAGNOSABLE CONDITIONS list. If a photo does not clearly match one of them, say so honestly and recommend an in-person check by an agronomist rather than guessing.
- Prices in the entries are historical figures from the book. Never present them as today's price; tell the farmer to ask local traders, buying points or factories.
- If asked about Fruit Development beyond the book entries, say plainly that the information comes from general agronomy research.
- Keep answers short and practical — written for a farmer reading on a phone, not an essay."""


def clean(text: str) -> str:
    # The source data carries stray "⚠ ⚠" review markers at the end of some answers.
    return re.sub(r"\s*(⚠\s*)+$", "", text.replace("⚠", "")).strip()


def entry_text(e: dict) -> str:
    tags = [f"#{e['id']}"]
    if e.get("source") and e["source"] != "V1 extraction":
        tags.append(f"p.{e['source'].removeprefix('p.')}")
    if e.get("needs_verification"):
        tags.append("[VERIFY NUMBERS]")
    lines = [
        " ".join(tags),
        f"Q: {e['q_km']} / {e['q_en']}",
        f"A (km): {clean(e['a_km'])}",
        f"A (en): {clean(e['a_en'])}",
    ]
    note = e.get("note", "")
    if note.startswith("Bot "):
        lines.append(f"Instruction: {note}")
    return "\n".join(lines)


def build(kb: dict) -> tuple[str, int, int]:
    ok = [e for e in kb["entries"] if e["status"] == "ok"]
    skipped = len(kb["entries"]) - len(ok)

    # v2 entries carry a section; the older v1 entries don't, so they get a general section.
    sections: dict[str, list[dict]] = {}
    for e in sorted(ok, key=lambda e: e["id"]):
        sections.setdefault(e.get("section", "General (from v1)"), []).append(e)
    order = sorted(sections, key=lambda s: (s.startswith("General"), s))

    parts = [HEADER.format(version=kb["version"], built=kb["built"])]
    for name in order:
        parts.append(f"== {name} ==\n" + "\n\n".join(entry_text(e) for e in sections[name]))
    parts += [DIAGNOSABLE, FRUIT_DEV, RULES]
    return "\n\n".join(parts), len(ok), skipped


def as_template_literal(text: str) -> str:
    return text.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")


def main() -> None:
    kb = json.loads(KB_JSON.read_text(encoding="utf-8"))
    text, n_ok, n_skipped = build(kb)
    literal = as_template_literal(text)

    for target in TS_TARGETS:
        target.write_text(
            "// GENERATED by scripts/build_kb.py from knowledge-base/kb-v2.json — do not edit by hand.\n"
            "// Re-run `npm run kb` after changing the JSON.\n\n"
            f"export const KNOWLEDGE_BASE = `{literal}`;\n",
            encoding="utf-8",
        )

    html = PROTOTYPE.read_text(encoding="utf-8")
    pattern = re.compile(r"(const KNOWLEDGE_BASE = `)(.*?)(`;)", re.DOTALL)
    if len(pattern.findall(html)) != 1:
        raise SystemExit("Could not find exactly one KNOWLEDGE_BASE const in the prototype")
    PROTOTYPE.write_text(pattern.sub(lambda m: m.group(1) + literal + m.group(3), html), encoding="utf-8")

    print(f"Included {n_ok} entries, skipped {n_skipped} flagged against the book; {len(text):,} characters.")


if __name__ == "__main__":
    main()
