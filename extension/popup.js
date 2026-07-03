function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  return Math.floor(s / 3600) + 'h ago';
}

function setStat(id, value) {
  document.getElementById(id).textContent = typeof value === 'number' ? value.toLocaleString() : '-';
}

async function refresh() {
  const { leetcoinScrape, leetcoinScrapeStatus, leetcoinSelectorOverrides } = await chrome.storage.local.get([
    'leetcoinScrape',
    'leetcoinScrapeStatus',
    'leetcoinSelectorOverrides',
  ]);
  const balEl = document.getElementById('balanceVal');
  const metaEl = document.getElementById('statusMeta');

  if (leetcoinScrape && typeof leetcoinScrape.balance === 'number') {
    balEl.textContent = leetcoinScrape.balance.toLocaleString();
    metaEl.textContent = 'via ' + (leetcoinScrape.sources && leetcoinScrape.sources.balance) + ' · ' + timeAgo(leetcoinScrape.scrapedAt);
  } else if (leetcoinScrapeStatus && leetcoinScrapeStatus.found === false) {
    balEl.textContent = '-';
    metaEl.textContent = 'not found on last scan (' + timeAgo(leetcoinScrapeStatus.checkedAt) + ') — try a manual selector below';
  } else {
    balEl.textContent = '-';
    metaEl.textContent = 'no scrape yet — open leetcode.com';
  }

  setStat('rankVal', leetcoinScrape && leetcoinScrape.rank);
  setStat('streakVal', leetcoinScrape && leetcoinScrape.streak);
  setStat('solvedVal', leetcoinScrape && leetcoinScrape.solved);

  const overrides = leetcoinSelectorOverrides || {};
  const field = document.getElementById('overrideField').value;
  document.getElementById('overrideInput').value = overrides[field] || '';
}

document.getElementById('rescanBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.url && tab.url.includes('leetcode.com')) {
    await chrome.tabs.sendMessage(tab.id, { type: 'leetcoin-rescan' });
    setTimeout(refresh, 300);
  } else {
    document.getElementById('statusMeta').textContent = 'switch to a leetcode.com tab first';
  }
});

document.getElementById('copyBtn').addEventListener('click', async () => {
  const { leetcoinScrape } = await chrome.storage.local.get('leetcoinScrape');
  if (leetcoinScrape && typeof leetcoinScrape.balance === 'number') {
    await navigator.clipboard.writeText(String(leetcoinScrape.balance));
    document.getElementById('statusMeta').textContent = 'copied ' + leetcoinScrape.balance.toLocaleString() + ' to clipboard';
  }
});

document.getElementById('overrideField').addEventListener('change', refresh);

document.getElementById('saveOverrideBtn').addEventListener('click', async () => {
  const field = document.getElementById('overrideField').value;
  const val = document.getElementById('overrideInput').value.trim();
  const { leetcoinSelectorOverrides } = await chrome.storage.local.get('leetcoinSelectorOverrides');
  const overrides = leetcoinSelectorOverrides || {};
  if (val) overrides[field] = val;
  else delete overrides[field];
  await chrome.storage.local.set({ leetcoinSelectorOverrides: overrides });
  document.getElementById('statusMeta').textContent = val ? field + ' selector saved' : field + ' selector cleared';
});

refresh();
