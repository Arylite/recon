import { zValidator } from '@hono/zod-validator';
import type { ZodType } from 'zod';

// The Android client reads {"error": "..."} from every failure.
export const validate = <T extends ZodType>(target: 'json' | 'query', schema: T) =>
  zValidator(target, schema, (result, c) => {
    if (!result.success) {
      const fields = [...new Set(result.error.issues.map((i) => i.path.join('.') || 'body'))].join(', ');
      return c.json({ error: `invalid: ${fields}` }, 400);
    }
  });
