'use client';
import { useState, type FormEvent } from 'react';
import { api, clientHash, Failure } from './api';
import { Message, Pill } from './bits';

const MIN_PASSWORD = 10;

export function Auth({ onSignedIn }: { onSignedIn: (name: string) => void }) {
  const [create, setCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    // Same normalisation as the Android app, since the name is part of the password hash.
    const name = String(form.get('name')).trim().toLowerCase();
    const password = String(form.get('password'));
    setError('');
    if (!/^[a-z0-9_]{3,32}$/.test(name)) return setError('The name takes 3 to 32 letters, digits or _.');
    if (create && password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters for the password.`);
    if (create && password !== String(form.get('again'))) return setError('The two passwords differ.');
    setBusy(true);
    try {
      const hash = await clientHash(name, password);
      const res = await api<{ name: string }>(create ? '/web/register' : '/web/login', 'POST', { name, password: hash });
      onSignedIn(res.name);
    } catch (err) {
      setError(err instanceof Failure ? err.message : 'Could not sign in.');
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <div className="auth-card">
        <svg className="logo" viewBox="0 0 108 108" width="56" height="56" aria-hidden="true">
          <rect width="108" height="108" rx="24" fill="#101010" />
          <circle cx="54" cy="54" r="8" fill="#E8492F" />
          <circle cx="54" cy="54" r="17" fill="none" stroke="#F3F0EA" strokeWidth="5" />
          <path d="M25 54A29 29 0 1 1 54 83" fill="none" stroke="#F3F0EA" strokeWidth="5" strokeLinecap="round" />
        </svg>
        <h1>
          Your <u>daily store</u>, watched.
        </h1>
        <p className="lede">Recon checks the Valorant store of your Riot accounts and tells you when a skin from your wishlist shows up.</p>
        <div className="segment" role="tablist" aria-label="Sign in or create an account">
          {[false, true].map((c) => (
            <button key={String(c)} type="button" role="tab" aria-selected={create === c} onClick={() => (setCreate(c), setError(''))}>
              {c ? 'Create account' : 'Sign in'}
            </button>
          ))}
        </div>
        <form onSubmit={submit} noValidate>
          <label>
            <span className="caption">Name</span>
            <input name="name" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={32} />
          </label>
          <label>
            <span className="caption">Password</span>
            <input name="password" type="password" autoComplete={create ? 'new-password' : 'current-password'} required />
          </label>
          {create && (
            <label>
              <span className="caption">Repeat the password</span>
              <input name="again" type="password" autoComplete="new-password" required />
            </label>
          )}
          {error && <Message>{error}</Message>}
          <Pill type="submit" busy={busy}>
            {create ? 'Create account' : 'Sign in'}
          </Pill>
        </form>
        <p className="fine">Your password never leaves this page: only a salted hash is sent. The same account works in the Android app.</p>
      </div>
    </main>
  );
}
