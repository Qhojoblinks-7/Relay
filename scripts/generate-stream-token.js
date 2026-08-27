const crypto = require('crypto');

const secret = process.argv[2];
const userId = process.argv[3] || 'dev-user';

if (!secret) {
  console.error('Usage: node generate-stream-token.js <API_SECRET> [USER_ID]');
  process.exit(1);
}

const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
const payload = Buffer.from(JSON.stringify({ user_id: userId, iat: Math.floor(Date.now() / 1000) })).toString('base64url');
const signature = crypto.createHmac('sha256', secret).update(header + '.' + payload).digest('base64url');

console.log(header + '.' + payload + '.' + signature);
