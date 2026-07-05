// Fetches your real-time LeetCoin balance from LeetCode's own small REST
// endpoint (found via DevTools Network tab - simpler than the GraphQL API).
//
// Run: node --env-file=cookie-sync/.env.local cookie-sync/points.mjs

const session = process.env.LEETCODE_SESSION;
const csrftoken = process.env.LEETCODE_CSRFTOKEN;

if (!session || !csrftoken) {
  console.error('Missing LEETCODE_SESSION / LEETCODE_CSRFTOKEN - run whoami.mjs first.');
  process.exit(1);
}

const res = await fetch('https://leetcode.com/points/api/total/', {
  headers: {
    'Cookie': `LEETCODE_SESSION=${session}; csrftoken=${csrftoken}`,
    'x-csrftoken': csrftoken,
    'x-requested-with': 'XMLHttpRequest',
    'Referer': 'https://leetcode.com/store/',
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
  },
});

if (!res.ok) {
  console.error('Request failed:', res.status, res.statusText);
  process.exit(1);
}

const data = await res.json();
if (typeof data.points !== 'number') {
  console.error('Unexpected response shape:', JSON.stringify(data));
  process.exit(1);
}

console.log('LeetCoin balance:', data.points);
