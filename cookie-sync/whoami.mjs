// Step 1 of the cookie-sync tool: confirm the cookie actually authenticates,
// before trying anything that touches private data like the coin balance.
//
// Run with:  node --env-file=cookie-sync/.env.local cookie-sync/whoami.mjs

const session = process.env.LEETCODE_SESSION;
const csrftoken = process.env.LEETCODE_CSRFTOKEN;

if (!session || !csrftoken) {
  console.error('Missing LEETCODE_SESSION / LEETCODE_CSRFTOKEN.');
  console.error('Copy cookie-sync/.env.local.example to cookie-sync/.env.local and fill it in.');
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
  body: JSON.stringify({
    query: `query globalData { userStatus { isSignedIn username } }`,
  }),
});

if (!res.ok) {
  console.error('Request failed:', res.status, res.statusText);
  process.exit(1);
}

const { data, errors } = await res.json();
if (errors) console.error('GraphQL errors:', errors);

if (data?.userStatus?.isSignedIn) {
  console.log(`Authenticated as: ${data.userStatus.username}`);
  console.log('Cookie works. Now capture the real balance query - see cookie-sync/README.md step 2.');
} else {
  console.log('Not signed in - the cookie is likely expired or wrong. Re-copy it from a fresh DevTools session.');
}
