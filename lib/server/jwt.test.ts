import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signToken, verifyToken, type AuthUser } from './jwt';

const SECRET = 'jwt-test-secret';
const USER: AuthUser = { id: 'user-1', email: 'a@b.com', name: 'A B', picture: 'https://x/y.png' };

test('signs and verifies an access token round-trip', async () => {
  const token = await signToken(SECRET, USER, 'access', 3600);
  const claims = await verifyToken(SECRET, token, 'access');
  assert.deepEqual(claims.user, USER);
  assert.equal(claims.token_type, 'access');
  assert.equal(claims.sub, USER.id);
});

test('rejects a refresh token presented as access', async () => {
  const token = await signToken(SECRET, USER, 'refresh', 3600);
  await assert.rejects(() => verifyToken(SECRET, token, 'access'));
});

test('rejects a token signed with a different secret', async () => {
  const token = await signToken(SECRET, USER, 'access', 3600);
  await assert.rejects(() => verifyToken('wrong-secret', token, 'access'));
});
