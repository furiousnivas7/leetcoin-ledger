# CLAUDE.md

Guidance for Claude Code in this repo.

**`AGENTS.md` is the source of truth** — read it for the full architecture, data shapes,
file-by-file guide, and verification steps. This file is the quick brief plus the
guardrails that matter most.

---

## What this is (one line)

**LeetCoin Tracker** — a personal, single-user tool: a standalone `localStorage` HTML
tracker (`leetcoin-ledger.html`) plus a Chrome Manifest V3 extension (`extension/`) that
reads the live LeetCoin balance from `leetcode.com` and auto-syncs it into the tracker.

Vanilla HTML/CSS/JS. **No build step, no framework, no server, no package manager, no
tests to run.** Don't add any of those without being asked.

---

## Guardrails (the ones that will bite if ignored)

- **Never touch session cookies / auth tokens in the tracker or extension.** The design
  avoids credentials entirely by running in the user's logged-in tab. Never read
  `document.cookie` or transmit session data from those two components.
  **Exception:** `cookie-sync/` is a separate, isolated, opt-in tool the user chose
  after the extension's selector flow proved too fiddly — see its own README. Don't
  extend that pattern into the tracker or extension.
- **Never add a backend, proxy, or cloud service.** If a task seems to need one, stop and
  say so — it's out of scope.
- **Never fetch `leetcode.com` from the tracker page** — blocked by CORS, by design. The
  extension is the only reader.
- **Scraped DOM text is untrusted:** use `textContent`, never `innerHTML` / `eval` /
  `insertAdjacentHTML`.
- **Right-size.** One user. No enterprise patterns. Adding complexity is the failure mode.
- **Preserve invariants:** the `<meta name="leetcoin-tracker">` guard in
  `content-tracker.js`, the idempotent Sync (no re-applying the same balance), and the
  fact that Sync *recalibrates* rather than overwrites the ledger.
- **Refactors change no behavior.** Small steps.

---

## How to run / verify (no test runner — this is expected)

1. `chrome://extensions` → **Developer mode** on → **Load unpacked** → select
   `extension/`.
2. Extension **Details** → enable **Allow access to file URLs**.
3. Reload the extension after any change.
4. Open the popup on a real logged-in `leetcode.com` tab; confirm balance /
   rank / streak / solved show correct values. **This scrape check is the one that
   matters** — everything else is downstream of it.
5. Open `leetcoin-ledger.html`; confirm auto-sync works and doesn't double-count or wipe
   the ledger; reload to confirm persistence.

For a pure helper (e.g. days-to-goal math) a single critical-path test is welcome — but
don't stand up a framework for it.

---

## Files

- `leetcoin-ledger.html` — tracker UI, ledger logic, `localStorage` (+ Firefox `file://`
  detection/warning and Export/Import JSON fallback — keep these).
- `extension/manifest.json` — MV3, least privilege.
- `extension/content-leetcode.js` — Balance + Streak via real API calls (confirmed
  working live); Rank + Solved via manual selector override (heuristic as last-resort
  fallback, which has never once succeeded against the real site) → `chrome.storage.local`.
- `extension/content-tracker.js` — runs on the tracker file only; auto-fills + clicks Sync.
- `extension/popup.html` / `popup.js` — dashboard, re-scan, copy fallback, per-field CSS
  selector override (the primary resilience mechanism — don't remove it).

---

## Verified

All four fields (Balance, Streak, Rank, Solved) have been confirmed working against a
real logged-in account. When a field ever misses again (site change), fix the
**selector or endpoint** (via the popup override), not the symptom. See `AGENTS.md` →
"Verified against the real, live, logged-in page".
