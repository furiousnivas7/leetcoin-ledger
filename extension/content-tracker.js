(function () {
  // Bail out immediately on every other local HTML file - only act on the
  // tracker page, identified by its own marker meta tag.
  const marker = document.querySelector('meta[name="leetcoin-tracker"]');
  if (!marker) return;

  async function applyIfNew() {
    const { leetcoinScrape, leetcoinLastAutoSync } = await chrome.storage.local.get([
      'leetcoinScrape',
      'leetcoinLastAutoSync',
    ]);
    if (!leetcoinScrape || typeof leetcoinScrape.balance !== 'number') return;
    if (leetcoinLastAutoSync && leetcoinLastAutoSync.balance === leetcoinScrape.balance) return;

    const amtInput = document.getElementById('syncAmt');
    const syncBtn = document.getElementById('syncBtn');
    if (!amtInput || !syncBtn) return;

    amtInput.value = leetcoinScrape.balance;
    syncBtn.click();
    await chrome.storage.local.set({
      leetcoinLastAutoSync: { balance: leetcoinScrape.balance, appliedAt: Date.now() },
    });
  }

  applyIfNew();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.leetcoinScrape) applyIfNew();
  });
})();
