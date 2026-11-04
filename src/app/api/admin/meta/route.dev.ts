import { meta } from '../../../../server/admin';
import { handler } from '../../../../server/http';

// The address the admin was opened on (Next.js reports localhost in req.url either way).
export const GET = handler((req) => meta(`http://${req.headers.get('host') ?? new URL(req.url).host}`), { admin: true });
