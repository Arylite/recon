'use client';
import { useState, type FormEvent } from 'react';
import { Icon, PillButton, type IconName } from './bits';
import { Sheet } from './Sheet';

const SIGN_IN = 'https://auth.riotgames.com/authorize?redirect_uri=https%3A%2F%2Fplayvalorant.com%2Fopt_in&client_id=play-valorant-web-prod&response_type=token%20id_token&scope=account%20openid&nonce=1';

/** The cookies pasted from the browser, one per line or separated by semicolons, as `a=1; b=2`. */
const normalize = (raw: string) =>
  raw
    .split(/[;\n]/)
    .map((p) => p.trim().replace(/\t+/g, '='))
    .filter((p) => p.includes('='))
    .join('; ');

const Step = ({ icon, children }: { icon: IconName; children: React.ReactNode }) => (
  <li className="step">
    <span className="step-icon">
      <Icon name={icon} size={18} />
    </span>
    <span className="body mute">{children}</span>
  </li>
);

/** The website cannot open Riot's login in a view like the app does: the cookies are copied over. */
export function AddAccount({ onSubmit, onClose }: { onSubmit: (cookies: string) => void; onClose: () => void }) {
  const [error, setError] = useState('');

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cookies = normalize(String(new FormData(e.currentTarget).get('cookies')));
    if (!cookies.includes('ssid=')) return setError("The ssid cookie is missing. Riot didn't keep you signed in: tick Stay signed in and copy it again.");
    onSubmit(cookies);
  }

  return (
    <Sheet caption="Add a Riot account" onClose={onClose}>
      <h1 className="title">Sign in on Riot</h1>
      <ol className="steps card">
        <Step icon="accounts">
          Sign in on <a href={SIGN_IN} target="_blank" rel="noopener noreferrer">Riot&apos;s own page</a>, in a private window, and tick Stay signed in. Recon never sees your password.
        </Step>
        <Step icon="catalog">Open the developer tools (F12), then Application (Chrome) or Storage (Firefox), then Cookies for auth.riotgames.com.</Step>
        <Step icon="add">
          Copy <code>ssid</code>, and <code>tdid</code>, <code>clid</code>, <code>csid</code> if they are there, and paste them below as <code>name=value</code>, one per line.
        </Step>
        <Step icon="refresh">Close the private window without signing out: Riot would end the session.</Step>
      </ol>
      <form className="stack" onSubmit={submit} noValidate>
        <textarea name="cookies" rows={5} placeholder={'ssid=...\ntdid=...'} aria-label="Riot cookies" autoComplete="off" spellCheck={false} maxLength={8000} onChange={() => setError('')} />
        {error && (
          <p className="body ember" role="alert">
            {error}
          </p>
        )}
        <PillButton type="submit">Add this account</PillButton>
      </form>
    </Sheet>
  );
}
