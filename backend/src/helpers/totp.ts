import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'crypto';
import { getJwtSecret } from '../middleware/authMiddleware';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const ISSUER = 'Doon Riders';

export const encodeBase32 = (input: Buffer): string => {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of input) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
};

export const decodeBase32 = (input: string): Buffer => {
  const normalized = input.toUpperCase().replace(/=+$/g, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const character of normalized) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index < 0) throw new Error('Invalid Base32 TOTP secret.');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
};

export const createTotpSecret = (): string => encodeBase32(randomBytes(20));

export const createTotpUri = (email: string, secret: string): string => {
  const label = `${ISSUER}:${email}`;
  const params = new URLSearchParams({
    secret,
    issuer: ISSUER,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });
  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
};

const generateTotp = (secret: string, counter: number): string => {
  const key = decodeBase32(secret);
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', key).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = ((digest[offset] & 0x7f) << 24)
    | ((digest[offset + 1] & 0xff) << 16)
    | ((digest[offset + 2] & 0xff) << 8)
    | (digest[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, '0');
};

export const verifyTotp = (secret: string, code: string, nowMs = Date.now()): boolean => {
  const normalizedCode = code.replace(/[\s-]/g, '');
  if (!/^\d{6}$/.test(normalizedCode)) return false;
  const currentCounter = Math.floor(nowMs / 30_000);
  for (let offset = -1; offset <= 1; offset += 1) {
    const expected = generateTotp(secret, currentCounter + offset);
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(normalizedCode);
    if (expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer)) {
      return true;
    }
  }
  return false;
};

const encryptionKey = (): Buffer => createHmac('sha256', getJwtSecret())
  .update('doon-riders:totp-secret-encryption:v1')
  .digest();

export const encryptTotpSecret = (secret: string): string => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${ciphertext.toString('base64url')}`;
};

export const decryptTotpSecret = (encrypted: string): string => {
  const [version, ivText, tagText, ciphertextText] = encrypted.split('.');
  if (version !== 'v1' || !ivText || !tagText || !ciphertextText) {
    throw new Error('Stored TOTP secret has an unsupported format.');
  }
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivText, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextText, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
};

export const createBackupCodes = (count = 10): string[] =>
  Array.from({ length: count }, () => randomBytes(10).toString('hex').toUpperCase());

export const hashBackupCode = (code: string): string => createHash('sha256')
  .update(code.replace(/[\s-]/g, '').toUpperCase())
  .digest('hex');
