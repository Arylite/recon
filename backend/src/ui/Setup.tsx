'use client';
import { useState, type FormEvent } from 'react';
import type { Loaded } from './App';
import { api, Failure, type AccountView, type Alert } from './api';
import { Icon, Message, Pill } from './bits';
import type { Notifier } from './notify';

/** The cookies pasted from the browser, one per line or separated by semicolons, as `a=1; b=2`. */
const normalize = (raw: string) =>
  raw
    .split(/[;\n]/)
    .map((p) => p.trim().replace(/\t+/g, '='))
    .filter((p) => p.includes('='))
    .join('; ');

function AddAccount({ onAdded }: { onAdded: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const cookies = normalize(String(data.get('cookies')));
    const name = String(data.get('name')).trim();
    setError('');
    if (!cookies.includes('ssid=')) return setError('The ssid cookie is missing.');
    setBusy(true);
    try {
      await api('/accounts', 'POST', { cookies, ...(name ? { name } : {}) });
      form.reset();
      onAdded();
    } catch (err) {
      setError(err instanceof Failure ? err.message : 'Could not add the account.');
    }
    setBusy(false);
  }

  return (
    <form className="card" onSubmit={submit} noValidate>
      <h3>Add a Riot account</h3>
      <details>
        <summary>How do I get the cookies?</summary>
        <ol>
          <li>Open auth.riotgames.com in a private window and sign in with your Riot ID, ticking &quot;Stay signed in&quot;.</li>
          <li>Open the developer tools (F12), then Application (Chrome) or Storage (Firefox), then Cookies for auth.riotgames.com.</li>
          <li>Copy the values of <code>ssid</code> (required), <code>tdid</code>, <code>clid</code> and <code>csid</code> and paste them below as <code>name=value</code>, one per line.</li>
          <li>Close the private window without signing out.</li>
        </ol>
      </details>
      <label>
        <span className="caption">Label (optional)</span>
        <input name="name" maxLength={64} autoComplete="off" placeholder="Main" />
      </label>
      <label>
        <span className="caption">Cookies</span>
        <textarea name="cookies" rows={4} autoComplete="off" spellCheck={false} placeholder={'ssid=...\ntdid=...'} required />
      </label>
      {error && <Message>{error}</Message>}
      <Pill type="submit" busy={busy}>
        Add account
      </Pill>
    </form>
  );
}

export function Setup(props: { name: string; accounts: Loaded<AccountView[]>; alerts: Loaded<Alert[]>; notifier: Notifier; onSignedOut: () => void }) {
  const { name, accounts, alerts, notifier, onSignedOut } = props;
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const run = async (job: () => Promise<unknown>) => {
    setError('');
    try {
      await job();
    } catch (e) {
      setError(e instanceof Failure ? e.message : 'Something went wrong.');
    }
  };
  const remove = (a: AccountView) =>
    window.confirm(`Remove ${a.name}? Its stored Riot session is deleted.`) && run(async () => (await api(`/accounts/${a.id}`, 'DELETE'), accounts.reload()));
  const test = () => run(async () => (await api('/alerts/test', 'POST'), setSent(true), await alerts.reload()));
  const signOut = async () => {
    await api('/web/logout', 'POST').catch(() => {});
    onSignedOut();
  };

  return (
    <>
      <header className="screen-head">
        <span className="caption">Signed in as {name}</span>
        <h1>Setup</h1>
      </header>
      {error && <Message>{error}</Message>}
      <h2 className="section">Riot accounts</h2>
      <ul className="rows">
        {(accounts.data ?? []).map((a) => (
          <li key={a.id} className="row">
            <div>
              <strong>{a.name}</strong>
              <small>{a.error ? 'Needs to be added again' : `Region ${a.shard.toUpperCase()}`}</small>
            </div>
            <button className="icon-btn" aria-label={`Remove ${a.name}`} onClick={() => void remove(a)}>
              <Icon name="trash" />
            </button>
          </li>
        ))}
      </ul>
      <AddAccount onAdded={() => void accounts.reload()} />
      <h2 className="section">Notifications</h2>
      <div className="card">
        <p>The Android app notifies you in the background. This page can also notify you while it stays open.</p>
        {notifier.supported && !notifier.denied ? (
          <button className="ghost" onClick={() => void notifier.toggle()} aria-pressed={notifier.on}>
            {notifier.on ? 'Browser notifications are on' : 'Turn on browser notifications'}
          </button>
        ) : (
          <p className="fine">{notifier.denied ? 'Notifications are blocked for this site in your browser settings.' : 'This browser does not support notifications.'}</p>
        )}
        <button className="ghost" onClick={() => void test()}>
          Send a test alert
        </button>
        {sent && <Message tone="note">Test alert queued: it shows below within a minute.</Message>}
      </div>
      <h2 className="section">Recent alerts</h2>
      {(alerts.data ?? []).length === 0 && <p className="fine">Nothing yet. Alerts appear here when a wishlist skin is in a store.</p>}
      <ul className="rows">
        {[...(alerts.data ?? [])].reverse().slice(0, 20).map((a) => (
          <li key={a.id} className="row">
            <div>
              <strong>{a.skin}</strong>
              <small>
                {a.account} / {new Date(a.ts).toLocaleString()}
              </small>
            </div>
          </li>
        ))}
      </ul>
      <button className="ghost danger" onClick={() => void signOut()}>
        Sign out
      </button>
    </>
  );
}
