# LeetCoin Ledger

A self-contained HTML tracker for the LeetCode coin cap grind. No build step, no server — open the file in any browser.

## What it does
- Tracks daily check-in + daily challenge completion
- Tracks weekly + biweekly contest participation (auto-applies the +25 dual-contest bonus)
- Logs one-off contributions (testcases, questions, violation reports, streak bonuses) with running totals
- Shows a 100-day activity heatmap
- Progress bar + estimated days-to-goal based on your last 14 days of activity
- Sync panel: paste your real LeetCode balance to recalibrate, since LeetCode doesn't expose coin balance publicly (no auto-scrape is possible — this is the honest workaround)
- All data persists locally via the in-browser storage API

## Usage
Open `leetcoin-ledger.html` in a browser (works as a Claude artifact or standalone file). Set your starting balance and goal in Settings, then check things off as you go.
