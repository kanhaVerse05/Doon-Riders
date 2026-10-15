import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createBackupCodes,
  createTotpSecret,
  decodeBase32,
  decryptTotpSecret,
  encodeBase32,
  encryptTotpSecret,
  hashBackupCode,
  verifyTotp,
} from './totp';

test('Base32 encoding and decoding round-trip', () => {
  const original = Buffer.from('Doon Riders');
  assert.deepEqual(decodeBase32(encodeBase32(original)), original);
});

test('TOTP verifier accepts RFC 6238 SHA-1 vector and rejects a wrong code', () => {
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  assert.equal(verifyTotp(secret, '287082', 59_000), true);
  assert.equal(verifyTotp(secret, '287083', 59_000), false);
  assert.equal(verifyTotp(secret, '287082', 120_000), false);
});

test('Encrypted TOTP secret decrypts only with the configured signing secret', () => {
  process.env.JWT_SECRET = 'test-only-jwt-secret-for-totp-unit-tests-32chars';
  const secret = createTotpSecret();
  const encrypted = encryptTotpSecret(secret);
  assert.notEqual(encrypted, secret);
  assert.equal(decryptTotpSecret(encrypted), secret);
  process.env.JWT_SECRET = 'another-test-only-jwt-secret-which-is-long-enough';
  assert.throws(() => decryptTotpSecret(encrypted));
  delete process.env.JWT_SECRET;
});

test('Backup codes are random and hashed after normalization', () => {
  const codes = createBackupCodes();
  assert.equal(codes.length, 10);
  assert.equal(new Set(codes).size, codes.length);
  assert.equal(hashBackupCode(codes[0]), hashBackupCode(codes[0].toLowerCase()));
  assert.notEqual(hashBackupCode(codes[0]), codes[0]);
});
