import { issueTicket } from '../../../auth';
import { ApiError, bearer } from '../../../guard';
import { route } from '../../../route';

// Trades the ticket-granting ticket for a short service ticket used on every other call.
export const POST = route({ auth: 'app' }, async ({ req, deps }) => {
  const user = await deps.db.byTgt(bearer(req.headers.get('Authorization')));
  if (!user) throw new ApiError(401, 'signed out, sign in again');
  return { name: user.name, ...issueTicket(user.id, deps.secret) };
});
