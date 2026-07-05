(function () {
  const FIELDS = {
    balance: { keyword: 'coin', max: 1000000 },
    rank: { keyword: 'rank', max: 100000000 },
    streak: { keyword: 'streak', max: 100000 },
    solved: { keyword: 'solved', max: 100000 },
  };

  function parseNumber(text, max) {
    if (!text) return null;
    const cleaned = text.replace(/[,\s]/g, '');
    if (!/^\d+$/.test(cleaned)) return null;
    const n = parseInt(cleaned, 10);
    return n < max ? n : null;
  }

  function tryOverrideSelector(selector, max) {
    if (!selector) return null;
    try {
      const el = document.querySelector(selector);
      if (el) return parseNumber(el.textContent.trim(), max);
    } catch (e) {
      // invalid selector from user input, ignore
    }
    return null;
  }

  // LeetCode doesn't publish stable selectors for any of this, so we scan for
  // anything referencing the field's keyword in its attributes/class, then
  // look for a plain number on that element or one of its immediate siblings.
  function heuristicScan(keyword, max) {
    const candidates = new Set();
    document.querySelectorAll('[aria-label],[title],[alt],[data-testid],[class]').forEach((el) => {
      const cls = typeof el.className === 'string' ? el.className : '';
      const hay = [
        el.getAttribute('aria-label'),
        el.getAttribute('title'),
        el.getAttribute('alt'),
        el.getAttribute('data-testid'),
        cls,
      ].filter(Boolean).join(' ').toLowerCase();
      if (hay.includes(keyword)) candidates.add(el);
    });

    for (const el of candidates) {
      let n = parseNumber(el.textContent && el.textContent.trim(), max);
      if (n !== null) return n;
      const parent = el.parentElement;
      if (parent) {
        for (const sib of parent.children) {
          if (sib === el) continue;
          n = parseNumber(sib.textContent && sib.textContent.trim(), max);
          if (n !== null) return n;
        }
      }
    }
    return null;
  }

  // LeetCode's own "Your Points" widget calls this same endpoint - found via
  // DevTools Network tab, not guessed. Since this runs as a same-origin fetch
  // from inside the real, already-authenticated leetcode.com tab, the browser
  // attaches cookies and passes Cloudflare's checks automatically - unlike a
  // standalone script replaying a copied cookie, which gets bot-challenged.
  // Far more reliable than DOM scraping, so it's tried first for balance.
  async function fetchRealBalance() {
    try {
      const res = await fetch('/points/api/total/', { credentials: 'include' });
      if (!res.ok) return null;
      const data = await res.json();
      return typeof data.points === 'number' ? data.points : null;
    } catch (e) {
      return null;
    }
  }

  // Same idea as fetchRealBalance, but via /graphql - this is the exact
  // "globalData" query LeetCode's own frontend fires on most pages, captured
  // from DevTools Network tab. /graphql isn't Cloudflare-challenged the way
  // /points/api/total/ is, so this works from a plain same-origin fetch too.
  async function fetchRealStreak() {
    try {
      const res = await fetch('/graphql', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operationName: 'globalData',
          query: `query globalData {
            streakCounter {
              streakCount
              __typename
            }
          }`,
          variables: {},
        }),
      });
      if (!res.ok) return null;
      const { data } = await res.json();
      const count = data?.streakCounter?.streakCount;
      return typeof count === 'number' ? count : null;
    } catch (e) {
      return null;
    }
  }

  async function scan() {
    const { leetcoinSelectorOverrides } = await chrome.storage.local.get('leetcoinSelectorOverrides');
    const overrides = leetcoinSelectorOverrides || {};
    const found = {};
    const sources = {};

    const apiBalance = await fetchRealBalance();
    if (apiBalance !== null) {
      found.balance = apiBalance;
      sources.balance = 'api';
    }

    const apiStreak = await fetchRealStreak();
    if (apiStreak !== null) {
      found.streak = apiStreak;
      sources.streak = 'api';
    }

    for (const [field, cfg] of Object.entries(FIELDS)) {
      if (field === 'balance' && apiBalance !== null) continue; // API already won
      if (field === 'streak' && apiStreak !== null) continue; // API already won
      let value = tryOverrideSelector(overrides[field], cfg.max);
      let source = 'override';
      if (value === null) {
        value = heuristicScan(cfg.keyword, cfg.max);
        source = 'heuristic';
      }
      if (value !== null) {
        found[field] = value;
        sources[field] = source;
      }
    }

    if (Object.keys(found).length > 0) {
      const { leetcoinScrape: prev } = await chrome.storage.local.get('leetcoinScrape');
      await chrome.storage.local.set({
        // merge so navigating off the profile page (where rank/streak/solved
        // live) doesn't wipe out fields we're no longer seeing on this page
        leetcoinScrape: { ...prev, ...found, sources, scrapedAt: Date.now() },
      });
    }

    if (found.balance === undefined) {
      await chrome.storage.local.set({
        leetcoinScrapeStatus: { found: false, checkedAt: Date.now() },
      });
    }
  }

  // When the extension is reloaded (chrome://extensions) while this tab is
  // still open, this orphaned copy of the script can no longer reach
  // chrome.storage - every call throws "Extension context invalidated."
  // Stop polling instead of spamming that error forever; reloading the tab
  // (not just the extension) is what actually fixes it.
  function isContextInvalidated(e) {
    return typeof e?.message === 'string' && e.message.includes('Extension context invalidated');
  }

  const intervalId = setInterval(() => {
    scan().catch((e) => {
      if (isContextInvalidated(e)) clearInterval(intervalId);
    });
  }, 5000);
  scan().catch((e) => {
    if (isContextInvalidated(e)) clearInterval(intervalId);
  });

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.type === 'leetcoin-rescan') {
      scan().then(() => sendResponse({ ok: true })).catch((e) => sendResponse({ ok: false, error: e.message }));
      return true;
    }
  });
})();
