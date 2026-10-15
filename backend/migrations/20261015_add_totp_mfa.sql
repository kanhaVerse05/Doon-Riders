-- Authenticator-based MFA storage. Secrets are encrypted by the backend;
-- backup codes are stored only as SHA-256 digests.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS totp_secret_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS totp_pending_secret_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS totp_backup_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS totp_failed_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS totp_locked_until TIMESTAMPTZ;
