import { route } from '../../route';
import { alertsQuery } from '../../schemas';

export const GET = route({ auth: 'user', query: alertsQuery }, async ({ user, query }) => user.alerts.filter((a) => a.id > query.since));
