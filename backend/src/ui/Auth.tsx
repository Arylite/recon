'use client';
import { useState, type FormEvent } from 'react';
import { api, clientHash, friendly, Failure } from './api';
import { Field, Logo, PillButton, Segmented } from './bits';

/** Sign in or create a Recon account; each account only ever sees its own Riot accounts. */
export function Auth({ onSignedIn }: { onSignedIn: (name: string) => void }) {
  const [mode, setMode] = useState(0);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const create = mode === 1;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = new FormData(e.currentTarget);
    // The same normalisation as the Android app, since the name is part of the password hash.
    const name = String(form.get('name')).trim().toLowerCase();
    const password = String(form.get('password'));
    if (!/^[a-z0-9_]{3,32}$/.test(name)) return setMessage(friendly(400, 'invalid: name'));
    if (password.length < 8) return setMessage(friendly(400, 'invalid: password'));
    setBusy(true);
    setMessage('');
    try {
      const res = await api<{ name: string }>(create ? '/web/register' : '/web/login', 'POST', { name, password: await clientHash(name, password) });
      onSignedIn(res.name);
    } catch (err) {
      setMessage(err instanceof Failure ? err.message : friendly(0, ''));
      setBusy(false);
    }
  }

  return (
    <>
      <div className="glow" aria-hidden="true" />
      <main className="screen auth">
        <Logo />
        <h1 className="title title-big">
          Get pinged when your skin hits the <u>store</u>
        </h1>
        <p className="body mute">Recon watches the daily store of your Riot accounts and tells you when a wishlisted skin is in it.</p>
        <Segmented label="Sign in or create an account" items={['Sign in', 'Create account']} selected={mode} onSelect={(i) => (setMode(i), setMessage(''))} />
        <form className="stack" onSubmit={submit} noValidate>
          <Field label="Name" name="name" icon="accounts" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={32} />
          <Field label={create ? 'Password, 8 characters or more' : 'Password'} name="password" type="password" icon={null} autoComplete={create ? 'new-password' : 'current-password'} />
          {message && (
            <p className="body ember" role="alert">
              {message}
            </p>
          )}
          <PillButton type="submit" disabled={busy}>
            {busy ? 'One moment' : create ? 'Create my account' : 'Sign in'}
          </PillButton>
        </form>
        <p className="fine">Your password never leaves this page: only a salted hash is sent, and the same account works in the Android app.</p>
      </main>
    </>
  );
}
