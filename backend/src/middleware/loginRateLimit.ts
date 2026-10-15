import { createHash } from 'crypto';
import { Request } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

const windowMs = 15 * 60 * 1000;
const tooManyAttempts = {
  success: false,
  message: 'Too many failed sign-in attempts. Please wait 15 minutes before trying again.'
};

const clientIpKey = (req: Request) => ipKeyGenerator(req.ip || req.socket.remoteAddress || 'unknown');

// A broader per-IP ceiling limits credential spraying across many account names.
export const loginIpRateLimit = rateLimit({
  windowMs,
  limit: 30,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: tooManyAttempts
});

// Five failed attempts per email/IP pair limit password guessing without
// allowing an attacker to lock an account for every other network user.
export const loginCredentialRateLimit = rateLimit({
  windowMs,
  limit: 5,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const key = `${clientIpKey(req)}:${email}`;
    return createHash('sha256').update(key).digest('hex');
  },
  message: tooManyAttempts
});
