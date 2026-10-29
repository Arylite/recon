import { route } from '../../route';

export const GET = route({ auth: 'none' }, async () => ({ ok: true }));
