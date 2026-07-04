# AGENTS.md

Guidance for AI coding agents (Claude Code, Cursor, etc.) working in this repo.
This file is the **source of truth**; `CLAUDE.md` points here.

---

## What this project is

**LeetCoin Tracker** — a personal, single-user tool that tracks a LeetCode LeetCoin
balance toward a redemption goal. It has two parts:

1. `leetcoin-ledger.html` — a standalone, dark/terminal-styled HTML file that stores a
   ledger + goal in `localStorage` and shows days-to-goal from a trailing 14-day rate.
2. `extension/` — a Chrome **Manifest V3** extension that reads the live balance
   (and rank/streak/solved) from `leetcode.com` and auto-syncs it into the tracker.

There is **no build step, no framework, no server, no database, no package manager**.
It's vanilla HTML/CSS/JS. Do not introduce any of those without an explicit request.

---

## The three principles this project is built on

These come from the engineering workflow the project was planned against. Honor them
in every change:

1. **One job per change.** Keep edits scoped. Don't refactor architecture while adding
   a feature while "improving" security in a single pass.
2. **Right-size everything.** This has exactly **one user**. Build for that, not for an
   imagined future of millions. Premature servers, queues, frameworks, and abstractions
   are the most likely way this tool dies. Add complexity only when a *real* signal
   demands it.
3. **Audit real code, not hypotheticals.** Security/performance reasoning must target
   code that actually exists here — not a generic checklist.

---

## Hard rules (do not violate)

- **Never handle a session cookie.** The whole design exists to avoid this. The
  extension reads data because it runs in the user's already-logged-in tab, not because
  it holds a credential. Never read, store, transmit, or ask for `document.cookie`, auth
  tokens, or session data.
- **Never add a backend / server / proxy / cloud service.** If a task seems to need one,
  stop and flag it — it almost certainly means the task is out of scope for this tool.
- **Never fetch `leetcode.com` from the tracker page.** It's blocked by CORS and that's
  by design. The extension (running on the site's own tab) is the only reader.
- **Treat all scraped DOM text as untrusted.** Insert it with `textContent`, never
  `innerHTML`. Scraped strings must never reach `innerHTML`, `insertAdjacentHTML`,
  `eval`, `new Function`, or a `<script>`.
- **No secrets in code.** There are none today; keep it that way.
- **Least privilege in `manifest.json`.** Don't broaden `host_permissions` or add
  permissions beyond what a field actually needs.
- **No behavior change during refactors.** If asked to clean up code, preserve what the
  product does. Refactor in small steps.

---

## Architecture & data flow

```
leetcode.com tab                chrome.storage.local           tracker file tab
content-leetcode.js  --writes-->  { balance, rank,   --reads-->  content-tracker.js
 (scrapes DOM ~5s)                  streak, solved,              (auto-fill + click Sync,
                                    selectorOverrides }           idempotent)
        ^                                 ^                               |
   popup.html/js  --------read/write------+                              v
   (dashboard, re-scan, copy fallback, CSS selector override)   leetcoin-ledger.html
                                                                (localStorage, Sync btn)
```

Key handshake details:

- `content-tracker.js` **must** guard on the `<meta name="leetcoin-tracker">` tag so it
  never runs on unrelated local HTML files. Preserve this guard.
- Sync is **idempotent** — it must not re-apply a balance value it already applied.
  Preserve the "last applied value" check.
- Sync **recalibrates the starting balance**; it does not overwrite the manual ledger.
  Don't change Sync to a destructive overwrite.

---

## File-by-file guide

| File | Role | When editing, watch for |
|---|---|---|
| `leetcoin-ledger.html` | Tracker UI + ledger logic + `localStorage` | Keep the Firefox `file://` `localStorage` detection + warning banner + Export/Import JSON fallback. Keep the `<meta name="leetcoin-tracker">` tag. |
| `extension/manifest.json` | MV3 config | Least privilege. Don't widen host permissions. |
| `extension/content-leetcode.js` | Scrapes leetcode.com → `chrome.storage.local` | Text-heuristic scraping is intentionally fuzzy (no stable selectors). Keep it resilient and side-effect-free on the page. |
| `extension/content-tracker.js` | Runs on tracker file; auto-fills + clicks Sync | Keep the meta-tag guard and the idempotency check. |
| `extension/popup.html` / `popup.js` | Dashboard, re-scan, copy fallback, per-field CSS selector override | The selector override is the primary resilience mechanism — don't remove it. |

---

## Data shapes

`chrome.storage.local` (extension side) — plain structured-cloneable key/value:

```jsonc
{
  "balance": 1234,           // last scraped LeetCoin balance (number | null)
  "rank": 45210,             // profile page only
  "streak": 30,
  "solved": 512,
  "lastScrapedAt": 1730000000000,   // epoch ms — powers the staleness indicator
  "selectorOverrides": {     // user-set CSS selectors when heuristics miss
    "balance": ".some-selector",
    "rank": null
  }
}
```

`localStorage` (tracker side) — a single JSON blob: the ledger entries, the goal config,
and the sync-calibration offset (the paste-in baseline that history is measured from).
This is client-side key-value storage, **not** a relational DB — don't model it like one.

---

## Verifying changes (there is no test runner)

There's no CI and no automated suite; verification is manual and that's appropriate here:

- **Extension logic:** load unpacked at `chrome://extensions`, enable *Allow access to
  file URLs*, reload the extension after changes.
- **Scraping:** open the popup on a real logged-in `leetcode.com` page and confirm the
  fields show correct values. This is the one genuinely important check.
- **Auto-sync:** open `leetcoin-ledger.html`, confirm the balance syncs and does **not**
  double-count or wipe the ledger.
- **Tracker persistence:** reload the file, confirm state survives (and that the Firefox
  `file://` warning path still works if you touch that code).

If you add a small pure helper (e.g. the days-to-goal math), a single critical-path test
is welcome — but don't stand up a heavy test framework for this.

---

## Over-engineering traps (don't do these)

- Adding React/Vue/Svelte/a bundler to a working vanilla HTML file.
- Adding a server "so it can fetch the balance automatically" — impossible without the
  cookie, and rejected on purpose.
- Building the public-stats "profile dashboard" — explicitly killed in discovery as
  cosmetic over-engineering; the extension popup already surfaces the extra stats.
- Replacing the manual selector override with a "smarter" auto-selector — LeetCoin has
  no stable selectors; the manual escape hatch is the correct design, not a stopgap.

---

## Known open item

The DOM scraping has **not** been verified against the real, live, logged-in
`leetcode.com` page. Until then, treat the scraping layer as unverified. When a field
misses: inspect the popup (found vs missing), find the right element in DevTools, set the
CSS override, confirm it sticks. Fix the root cause (selector), don't hard-code a value.
