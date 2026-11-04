import { validate } from '../../../../server/admin';
import { handler, jsonBody } from '../../../../server/http';

export const POST = handler(
  async (req) => {
    validate(await jsonBody(req));
    return { ok: true };
  },
  { admin: true },
);
