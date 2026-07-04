# LeetCoin Tracker

A personal, single-user tool to track your LeetCode **LeetCoin** balance toward a
redemption goal — current balance, progress to goal, and an estimated days-to-goal
based on your trailing 14-day earning rate.

No backend. No login. No account created anywhere. Everything runs locally on your
own machine and inside your own already-logged-in browser tab.

---

## Why it's built this way (read this first)

Your LeetCoin balance is **private account data**. LeetCode exposes **no public API**
for it, and a browser will not let an arbitrary page fetch `leetcode.com` on your
behalf (Same-Origin Policy / CORS). A pasted profile URL carries **no login
credential**, so a plain web page fundamentally cannot read your private balance.

There are only two honest ways to read authenticated data:

1. Run code **inside your already-logged-in browser tab** (no credential handling
   needed — you're already authenticated). → **This is what we do.**
2. Hand a server your literal **session cookie** (that cookie *is* your live login —
   risky, and pointless for a personal coin tracker). → Rejected.

So the project is deliberately split into a **local HTML tracker** plus a small
**Chrome extension** that reads the balance from the page you can already see.

---

## Components

| Component | What it is | What it does |
|---|---|---|
| `leetcoin-ledger.html` | A single dark/terminal-styled HTML file | Tracks daily check-in + daily challenge, weekly + biweekly contests (auto-applies the dual-participation bonus), a free-form contribution ledger, and a goal bar with days-to-goal. Persists to `localStorage`. |
| `extension/` | A Chrome Manifest V3 extension | Reads your live balance (and rank/streak/solved) from `leetcode.com` while you browse, and auto-syncs it into the tracker file when it's open. |

---

## Install (one-time)

1. Open `chrome://extensions`, enable **Developer mode** (top-right).
2. Click **Load unpacked** and select the `extension/` folder.
3. Open the extension's **Details** and turn on **Allow access to file URLs**
   (required so the extension can talk to your local `leetcoin-ledger.html`).
4. Open `leetcoin-ledger.html` in Chrome and keep the tab around.

## Daily use

- Browse `leetcode.com` normally while logged in. The extension silently picks up
  your **balance** on most pages, and **rank / streak / solved** on your profile page.
- Whenever the tracker file is open and a new balance is available, it **auto-syncs** —
  no copy-paste needed day to day.
- You still tick the **daily / weekly checkboxes** and add **contribution entries** by
  hand. That's the actual grind-tracking and was never meant to be automated.
- The **popup** is your dashboard for the extra stats and for fixing a selector if a
  field stops being found.

---

## How it works (architecture in one screen)

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

- **`content-tracker.js` only runs on the tracker file**, identified by a
  `<meta name="leetcoin-tracker">` tag — so it ignores every other local HTML file.
- The Sync step is **idempotent**: it won't re-trigger on a balance it already applied.
- Sync **recalibrates the starting point** rather than overwriting history, so your
  manual ledger isn't wiped or double-counted.

---

## Data & privacy

- All data lives in **`localStorage`** (tracker) and **`chrome.storage.local`**
  (extension) on your own machine. Nothing is sent anywhere.
- **No session cookie is ever read, stored, or transmitted.** The extension works
  because it runs in your logged-in tab, not because it holds any credential.
- Use the **Export / Import JSON** buttons in the tracker for backups.

---

## Troubleshooting

**A stat shows blank or wrong in the popup.**
LeetCode has no stable public CSS selectors, so a site layout change can break the
scraping heuristic. Open the popup, use the **manual CSS-selector override** for that
field to point it at the right element, and it'll stick. Copy-to-clipboard is there as
a fallback if you'd rather paste manually.

**Firefox: the tracker doesn't remember anything.**
Firefox blocks `localStorage` on `file://` pages. The tracker detects this and shows a
warning banner — use the **Export / Import JSON** buttons instead, or serve the file
over `http://localhost`. (The extension itself is Chrome-only.)

**The tracker isn't auto-syncing.**
Confirm **Allow access to file URLs** is on for the extension, the tracker tab is open,
and the popup is actually showing a scraped balance.

---

## Project structure

```
.
├── leetcoin-ledger.html      # the tracker (standalone, localStorage)
├── extension/
│   ├── manifest.json         # Manifest V3
│   ├── content-leetcode.js   # scrapes leetcode.com -> chrome.storage.local
│   ├── content-tracker.js    # runs on tracker file, auto-fills + clicks Sync
│   ├── popup.html
│   └── popup.js              # dashboard, re-scan, copy fallback, selector override
├── README.md
├── AGENTS.md                 # guidance for AI coding agents (source of truth)
└── CLAUDE.md                 # Claude Code pointer + guardrails
```

---

## Status

MVP built; the Chrome extension is the chosen path. **One item is still open:** the
DOM scraping has not yet been verified against the real, live, logged-in
`leetcode.com` page. Until you've watched the popup pull your real balance once, treat
the scraping layer as unverified — however clean the code looks.

## Scope (deliberately *not* doing)

This is a personal tool for one user. By design there is **no** server, backend proxy,
CI/CD, container, database, auth system, or public-stats dashboard. Those would be
over-engineering for cosmetic data relative to the one number (the balance) that feeds
the goal math. Keep it this way unless a real need appears.
