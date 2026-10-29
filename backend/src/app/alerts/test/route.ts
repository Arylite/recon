import { route } from '../../../route';

// A fake alert for "Send a test notification"; the client picks it up like a real one.
export const POST = route({ auth: 'user' }, async ({ deps, user }) => {
  const id = await deps.db.update(user.id, (u) => {
    u.alerts.push({ id: ++u.lastAlertId, ts: Date.now(), account: u.accounts[0]?.name ?? 'Recon', skin: 'Reaver Vandal (test)' });
    return u.lastAlertId;
  });
  return { id };
});
