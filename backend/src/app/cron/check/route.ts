import { route } from '../../../route';

// A full check can take a while: let the function run up to a minute.
export const maxDuration = 60;

/** Called every 15 minutes by the scheduler (see .github/workflows/check.yml). */
export const GET = route({ auth: 'cron' }, async ({ deps }) => {
  await deps.checkAll();
  return { ok: true };
});
