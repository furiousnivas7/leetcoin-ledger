# LeetCoin Ledger Sync (Chrome extension)

Reads your LeetCoin balance while you're logged into leetcode.com and auto-fills it into the tracker's sync box — so you don't have to copy it over by hand. Also picks up rank, streak, and solved-count as a bonus, shown in the popup.

**Status: verified working against a real, live, logged-in account** — all four fields confirmed. Balance and Streak via real API calls; Rank and Solved via manual selector override (see below for why).

## How it works
- **Balance** is fetched from LeetCode's own `/points/api/total/` endpoint (the same call the site's own "Your Points" widget makes), as a same-origin `fetch()` from inside the real, already-logged-in tab.
- **Streak** is fetched the same way via `/graphql` (the `globalData` query's `streakCounter.streakCount` field) — this is the small flame-icon counter, not the longer "current streak" number on the activity-calendar section of your profile (that one's a different field we haven't wired up, `userCalendar.streak`).
- Both of the above work because they're same-origin fetches from inside the real, already-logged-in tab — no cookie or credential handling needed, the browser attaches auth automatically like any other request the page makes.
- **Rank/Solved** have no known API endpoint yet, so those use a per-field manual CSS-selector override (set via the popup) — DOM scraping is attempted as a last-resort fallback, but in practice it has never once found anything on the real site (LeetCode's markup has no "rank"/"solved" text in any attribute/class we can key off). Both only show up while you're on your profile page, since that's where the override's selector actually matches something.
- Values persist across page navigation: visiting a page that only has the balance doesn't erase rank/solved from an earlier profile visit.
- A content script on the tracker file (`leetcoin-ledger.html`, identified by its `<meta name="leetcoin-tracker">` tag) picks up new **balance** values and clicks Sync for you — rank/streak/solved are informational only and live in the popup, they don't feed the tracker's goal math.
- Nothing leaves your machine — no server, no external requests, just `chrome.storage.local` passing values between two tabs you own.

## Install (unpacked, for personal use)
1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked**, and select this `extension/` folder.
4. Click the extension's **Details**, then turn on **Allow access to file URLs**. This step is mandatory and Chrome doesn't allow it to be set from the manifest — the tracker won't auto-fill without it.
5. Open your local `leetcoin-ledger.html` and a `leetcode.com` tab. Give it a few seconds.

## If a value doesn't show up
Balance/Streak should just work via their API calls above. If one breaks (LeetCode changed the endpoint), or Rank/Solved show blank on your profile page:
1. On leetcode.com, use the DevTools element picker (Cmd+Shift+C) and click directly on the number — precisely, since some numbers (like the circular "Solved" ring) stack multiple layered elements at the same spot.
2. In the Elements panel, right-click the highlighted line → **Copy → Copy selector**.
3. Click the extension icon, pick the field from the dropdown, paste the selector, and save.
4. Click **Re-scan current tab**.

Gotcha we actually hit: LeetCode's profile page shows more than one "solved" number — the total in the circular ring widget near the top, and a separate per-language count further down (e.g. "421 problems solved" under a specific language). Make sure you're inspecting the ring widget's total, not the per-language one.

The popup also has a **Copy balance** button if you'd rather paste it into Sync manually than rely on auto-fill.

## Scope note
This automates reading your own logged-in session's page — it's not calling any private API, and it's not scraping anyone else's data. It's still automated interaction with leetcode.com that the site doesn't officially endorse, so this is meant for personal use, not redistribution.
