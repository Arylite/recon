import { route } from '../../route';

export const GET = route({ auth: 'user' }, async ({ deps }) => deps.catalog.get());
