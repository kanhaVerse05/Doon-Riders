'use client';

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { adminApi } from '../../../lib/adminApi';
import { QRCodeSVG } from 'qrcode.react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaSetup, setMfaSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [setupCode, setSetupCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [mfaBusy, setMfaBusy] = useState(false);
  const [mfaMessage, setMfaMessage] = useState('');
  const [mfaError, setMfaError] = useState('');

  const fetchSettings = async () => {
    try {
      const res = await adminApi.get('/admin/settings');
      if (res.success) setSettings(res.data);
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    adminApi.get('/admin/auth/mfa/status').then((res) => {
      if (res?.success) setMfaEnabled(Boolean(res.enabled));
    });
  }, []);

  const startAuthenticatorSetup = async () => {
    setMfaBusy(true);
    setMfaError('');
    setMfaMessage('');
    try {
      const res = await adminApi.post('/admin/auth/mfa/setup', {});
      if (!res?.success) throw new Error(res?.message || 'Could not start authenticator setup.');
      setMfaSetup({ secret: res.secret, otpauthUrl: res.otpauthUrl });
      setSetupCode('');
    } catch (error: any) {
      setMfaError(error.message || 'Could not start authenticator setup.');
    } finally {
      setMfaBusy(false);
    }
  };

  const confirmAuthenticatorSetup = async (event: React.FormEvent) => {
    event.preventDefault();
    setMfaBusy(true);
    setMfaError('');
    try {
      const res = await adminApi.post('/admin/auth/mfa/confirm', { code: setupCode });
      if (!res?.success) throw new Error(res?.message || 'Authenticator code did not verify.');
      setMfaEnabled(true);
      setMfaSetup(null);
      setSetupCode('');
      setBackupCodes(res.backupCodes || []);
      setMfaMessage('Authenticator enabled. Save each backup code safely; each can be used once.');
    } catch (error: any) {
      setMfaError(error.message || 'Authenticator code did not verify.');
    } finally {
      setMfaBusy(false);
    }
  };

  const disableAuthenticator = async (event: React.FormEvent) => {
    event.preventDefault();
    setMfaBusy(true);
    setMfaError('');
    setMfaMessage('');
    try {
      const res = await adminApi.post('/admin/auth/mfa/disable', { password: disablePassword, code: disableCode });
      if (!res?.success) throw new Error(res?.message || 'Could not disable authenticator.');
      setMfaEnabled(false);
      setDisablePassword('');
      setDisableCode('');
      setBackupCodes([]);
      setMfaMessage('Authenticator disabled.');
    } catch (error: any) {
      setMfaError(error.message || 'Could not disable authenticator.');
    } finally {
      setMfaBusy(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div>
          <h2 className="text-2xl font-bold text-[#111827] tracking-tight">System Settings & Configuration</h2>
          <p className="text-xs text-[#667085] mt-0.5">Manage business parameters and lead routing engine</p>
        </div>

        <section className="rounded-2xl border border-[#D8E4DD] bg-white p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[#111827]">Google Authenticator security</h3>
              <p className="mt-1 text-sm text-[#667085]">Add a 6-digit verification code to Super Admin sign-in.</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${mfaEnabled ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>
              {mfaEnabled ? 'Enabled' : 'Not enabled'}
            </span>
          </div>

          {mfaError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{mfaError}</p>}
          {mfaMessage && <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{mfaMessage}</p>}

          {!mfaEnabled && !mfaSetup && (
            <button type="button" disabled={mfaBusy} onClick={startAuthenticatorSetup} className="rounded-xl bg-[#00C968] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
              {mfaBusy ? 'Starting…' : 'Set up authenticator'}
            </button>
          )}

          {mfaSetup && !mfaEnabled && (
            <div className="grid gap-5 md:grid-cols-[220px_1fr]">
              <div className="flex w-fit flex-col items-center gap-2 rounded-xl border bg-white p-3">
                <QRCodeSVG value={mfaSetup.otpauthUrl} size={190} level="M" />
                <span className="text-xs text-slate-500">Scan with Google Authenticator</span>
              </div>
              <div className="space-y-3">
                <p className="text-sm text-slate-700">In Google Authenticator, tap <b>+</b> and scan the QR code. If you cannot scan it, enter the setup key manually:</p>
                <code className="block break-all rounded-lg bg-slate-100 p-3 text-sm font-bold tracking-wider">{mfaSetup.secret}</code>
                <form onSubmit={confirmAuthenticatorSetup} className="flex flex-wrap items-end gap-3">
                  <label className="space-y-1 text-sm font-semibold text-slate-700">
                    <span>6-digit verification code</span>
                    <input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={setupCode} onChange={(event) => setSetupCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className="block w-44 rounded-lg border px-3 py-2 text-center text-lg tracking-[0.3em]" />
                  </label>
                  <button disabled={mfaBusy} className="rounded-xl bg-[#00C968] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{mfaBusy ? 'Verifying…' : 'Verify and enable'}</button>
                  <button type="button" onClick={() => setMfaSetup(null)} className="rounded-xl border px-4 py-2.5 text-sm font-semibold text-slate-600">Cancel</button>
                </form>
              </div>
            </div>
          )}

          {backupCodes.length > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
              <p className="mb-2 text-sm font-bold text-amber-900">One-time backup codes — save them now</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {backupCodes.map((code) => <code key={code} className="rounded bg-white px-2 py-1 text-center text-xs font-bold">{code}</code>)}
              </div>
              <button type="button" onClick={() => { navigator.clipboard?.writeText(backupCodes.join('\n')); }} className="mt-3 text-sm font-bold text-amber-900 underline">Copy backup codes</button>
            </div>
          )}

          {mfaEnabled && (
            <form onSubmit={disableAuthenticator} className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <label className="space-y-1 text-sm font-semibold text-slate-700">Password
                <input type="password" required value={disablePassword} onChange={(event) => setDisablePassword(event.target.value)} className="block w-full rounded-lg border px-3 py-2" />
              </label>
              <label className="space-y-1 text-sm font-semibold text-slate-700">Current authenticator code
                <input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={disableCode} onChange={(event) => setDisableCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className="block w-full rounded-lg border px-3 py-2" />
              </label>
              <button disabled={mfaBusy} className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 disabled:opacity-60">Disable authenticator</button>
            </form>
          )}
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {settings.map((s) => (
            <div key={s.id} className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-[#111827] font-mono uppercase">{s.key}</h3>
              <p className="text-xs text-[#667085]">{s.description}</p>
              <pre className="bg-[#F7F9FA] text-[#00A854] p-4 rounded-xl text-xs font-mono border border-[#E5E7EB] overflow-x-auto">
                {JSON.stringify(s.value, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
