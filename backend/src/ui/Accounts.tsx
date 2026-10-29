'use client';
import { friendly, type AccountView } from './api';
import { Icon, IconBtn, Label, PillButton, Skeleton, type IconName } from './bits';
import type { Notifier } from './notify';

function AccountRow({ account, onDelete }: { account: AccountView; onDelete: () => void }) {
  const failed = account.error !== null;
  const name = account.name.split('#')[0] ?? account.name;
  return (
    <li className="row">
      <div>
        <p className="skin-line">{name}</p>
        <p className={`body ${failed ? 'ember' : 'mute'}`}>{failed ? friendly(0, account.error) : 'Watching'}</p>
      </div>
      <IconBtn icon="remove" label={`Remove ${account.name}`} onClick={onDelete} />
    </li>
  );
}

const Step = ({ icon, text }: { icon: IconName; text: string }) => (
  <li className="step">
    <span className="step-icon">
      <Icon name={icon} size={18} />
    </span>
    <span className="body mute">{text}</span>
  </li>
);

export function Accounts(props: { user: string; accounts: AccountView[]; loaded: boolean; notifier: Notifier; onAdd: () => void; onDelete: (a: AccountView) => void; onSignOut: () => void; onTest: () => void }) {
  const { user, accounts, loaded, notifier, onAdd, onDelete, onSignOut, onTest } = props;
  return (
    <div className="screen">
      <header>
        <Label>Hi {user}</Label>
        <h1 className="title">Your Riot accounts</h1>
      </header>
      <ul className="rows">
        {!loaded && <Skeleton height={72} />}
        {accounts.map((a) => (
          <AccountRow key={a.id} account={a} onDelete={() => onDelete(a)} />
        ))}
        <li>
          <button className="addslot dashed" onClick={onAdd}>
            <span className="skin-line">Add a Riot account</span>
            <span className="addslot-dot">
              <Icon name="add" />
            </span>
          </button>
        </li>
      </ul>
      <Label className="spaced">How it works</Label>
      <ul className="steps card">
        <Step icon="accounts" text="You sign in on Riot's own page. Recon never sees your password." />
        <Step icon="refresh" text="Recon looks at your store every 15 minutes, even with the tab closed." />
        <Step icon="wishlist" text="A skin from your wishlist shows up: you get a notification." />
      </ul>
      {notifier.supported && (
        <div className="row">
          <div>
            <p className="skin-line">Notify me in this browser</p>
            <p className="body mute">{notifier.denied ? 'Blocked in your browser settings.' : 'While a Recon tab is open. The Android app covers the rest.'}</p>
          </div>
          <button className="switch" role="switch" aria-checked={notifier.on} aria-label="Notify me in this browser" disabled={notifier.denied} onClick={() => void notifier.toggle()} />
        </div>
      )}
      {/* Goes through the server and the background check, like a real alert. */}
      <PillButton onClick={onTest}>Send a test notification</PillButton>
      <button className="textbtn" onClick={onSignOut}>
        Sign out
      </button>
    </div>
  );
}
