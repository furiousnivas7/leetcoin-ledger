# LeetCoin Ledger Sync (Chrome extension)

Reads your LeetCoin balance while you're logged into leetcode.com and auto-fills it into the tracker's sync box — so you don't have to copy it over by hand.

## How it works
- A content script on `leetcode.com` scans the page for the LeetCoin number and saves it to the extension's local storage every few seconds.
- A content script on the tracker file (`leetcoin-ledger.html`, identified by its `<meta name="leetcoin-tracker">` tag) picks up new values and clicks Sync for you.
- Nothing leaves your machine — no server, no external requests, just `chrome.storage.local` passing a number between two tabs you own.

## Install (unpacked, for personal use)
1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked**, and select this `extension/` folder.
4. Click the extension's **Details**, then turn on **Allow access to file URLs**. This step is mandatory and Chrome doesn't allow it to be set from the manifest — the tracker won't auto-fill without it.
5. Open your local `leetcoin-ledger.html` and a `leetcode.com` tab. Give it a few seconds.

## If the balance doesn't show up
LeetCode doesn't publish a stable, documented selector for the LeetCoin number, so this extension scans for anything referencing "coin" in nearby attributes/classes. If that heuristic misses on your account's current UI:
1. On leetcode.com, right-click the LeetCoin number → **Inspect**.
2. In devtools, right-click the highlighted element → **Copy → Copy selector**.
3. Click the extension icon, paste that selector into **Manual selector override**, and save.
4. Click **Re-scan current tab**.

The popup also has a **Copy balance** button if you'd rather paste it into Sync manually than rely on auto-fill.

## Scope note
This automates reading your own logged-in session's page — it's not calling any private API, and it's not scraping anyone else's data. It's still automated interaction with leetcode.com that the site doesn't officially endorse, so this is meant for personal use, not redistribution.
