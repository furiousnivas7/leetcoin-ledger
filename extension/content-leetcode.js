(function () {
  const MAX_PLAUSIBLE_BALANCE = 1000000;

  function parseNumber(text) {
    if (!text) return null;
    const cleaned = text.replace(/[,\s]/g, '');
    if (!/^\d+$/.test(cleaned)) return null;
    const n = parseInt(cleaned, 10);
    return n < MAX_PLAUSIBLE_BALANCE ? n : null;
  }

  function tryOverrideSelector(selector) {
    if (!selector) return null;
    try {
      const el = document.querySelector(selector);
      if (el) return parseNumber(el.textContent.trim());
    } catch (e) {
      // invalid selector from user input, ignore
    }
    return null;
  }

  // LeetCode doesn't publish a stable selector for this, so we scan for
  // anything referencing "coin" in its attributes/class, then look for a
  // plain number on that element or one of its immediate siblings.
  function heuristicScan() {
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
      if (hay.includes('coin')) candidates.add(el);
    });

    for (const el of candidates) {
      let n = parseNumber(el.textContent && el.textContent.trim());
      if (n !== null) return n;
      const parent = el.parentElement;
      if (parent) {
        for (const sib of parent.children) {
          if (sib === el) continue;
          n = parseNumber(sib.textContent && sib.textContent.trim());
          if (n !== null) return n;
        }
      }
    }
    return null;
  }

  async function scan() {
    const { leetcoinSelectorOverride } = await chrome.storage.local.get('leetcoinSelectorOverride');
    let balance = tryOverrideSelector(leetcoinSelectorOverride);
    let source = 'override';
    if (balance === null) {
      balance = heuristicScan();
      source = 'heuristic';
    }
    if (balance !== null) {
      await chrome.storage.local.set({
        leetcoinScrape: { balance, scrapedAt: Date.now(), source },
      });
    } else {
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
