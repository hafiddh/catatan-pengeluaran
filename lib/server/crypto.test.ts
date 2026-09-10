import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decryptInt64, encryptInt64 } from './crypto';

const SECRET = 'test-secret-key-for-vector-1234';
const GO_CIPHERTEXT = 'NNUAJFXyyj0PWuqbMlqyZqepfMBlmRzMQmHcD7OhoqAUVg';

test('decrypts a ciphertext produced by the Go backend', () => {
  assert.equal(decryptInt64(SECRET, GO_CIPHERTEXT), 123456);
});

test('round-trips its own encrypt/decrypt', () => {
  const token = encryptInt64(SECRET, 987654);
  assert.equal(decryptInt64(SECRET, token), 987654);
});

test('rejects an empty token', () => {
  assert.throws(() => decryptInt64(SECRET, ''));
});

test('rejects a token decrypted with the wrong secret', () => {
  assert.throws(() => decryptInt64('a-completely-different-secret', GO_CIPHERTEXT));
});
