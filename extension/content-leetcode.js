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

  async function scan() {
    const { leetcoinSelectorOverrides } = await chrome.storage.local.get('leetcoinSelectorOverrides');
    const overrides = leetcoinSelectorOverrides || {};
    const found = {};
    const sources = {};

    for (const [field, cfg] of Object.entries(FIELDS)) {
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

  scan();
  setInterval(scan, 5000);

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.type === 'leetcoin-rescan') {
      scan().then(() => sendResponse({ ok: true }));
      return true;
    }
  });
})();
