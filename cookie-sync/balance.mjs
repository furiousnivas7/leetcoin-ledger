// Step 2 of the cookie-sync tool: replay LeetCode's OWN real query (captured
// from its Network tab, not guessed) with your cookie, and print the raw
// response so you can find the coin balance field in it.
//
// Run with:  node --env-file=cookie-sync/.env.local cookie-sync/balance.mjs

import { readFileSync } from 'node:fs';

const session = process.env.LEETCODE_SESSION;
const csrftoken = process.env.LEETCODE_CSRFTOKEN;

if (!session || !csrftoken) {
  console.error('Missing LEETCODE_SESSION / LEETCODE_CSRFTOKEN - see whoami.mjs first.');
  process.exit(1);
}

let captured;
try {
  captured = JSON.parse(readFileSync(new URL('./query.local.json', import.meta.url)));
} catch (e) {
  console.error('Could not read cookie-sync/query.local.json.');
  console.error('Copy query.local.json.example to query.local.json and fill it in - see README.md step 2.');
  process.exit(1);
}

const res = await fetch('https://leetcode.com/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': `LEETCODE_SESSION=${session}; csrftoken=${csrftoken}`,
    'x-csrftoken': csrftoken,
    'Referer': 'https://leetcode.com/',
  },
  body: JSON.stringify({ query: captured.query, variables: captured.variables ?? {} }),
});

if (!res.ok) {
  console.error('Request failed:', res.status, res.statusText);
  process.exit(1);
}

const json = await res.json();
console.log(JSON.stringify(json, null, 2));
console.log('\nFind the coin balance number above, then tell me its field path so we can print just that number.');
