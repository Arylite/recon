import { ApiError } from '../../../guard';
import { route } from '../../../route';
import { skinDetail } from '../../../skin';

/** Variants and levels of one skin, for the skin sheet of the website. */
export const GET = route({ auth: 'user' }, async ({ deps, params }) => {
  const uuid = params.uuid ?? '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(uuid)) throw new ApiError(400, 'invalid: uuid');
  try {
    return await skinDetail(deps.kv, uuid);
  } catch (e) {
    console.error(`skin ${uuid} failed:`, e);
    throw new ApiError(502, 'the skin details are not available right now');
  }
});
