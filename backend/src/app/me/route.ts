import { route } from '../../route';

export const GET = route({ auth: 'user' }, async ({ user }) => ({ name: user.name }));
