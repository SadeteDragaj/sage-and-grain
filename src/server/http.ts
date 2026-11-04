// Helpers for the route handlers under src/app/api (dev server only).
// Errors keep FastAPI's shape, {"detail": ...}, which the admin UI reads.

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly detail: unknown,
  ) {
    super(typeof detail === 'string' ? detail : `HTTP ${status}`);
  }
}

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);
const ADMIN_HEADER = 'x-sage-admin';

/**
 * The admin is for your own computer only. The dev server listens on 127.0.0.1,
 * requests addressed to any other host are refused, and every change needs the
 * X-Sage-Admin header, which a web page on another site can't send without a
 * CORS preflight this server never approves.
 */
function checkAdmin(req: Request) {
  const host = new URL(req.url).hostname;
  const header = req.headers.get('host')?.replace(/:\d+$/, '') ?? host;
  if (!LOCAL_HOSTS.has(host) || !LOCAL_HOSTS.has(header)) throw new HttpError(403, 'The admin only works on this computer.');
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.headers.get(ADMIN_HEADER) !== '1') {
    throw new HttpError(403, 'Missing admin header.');
  }
}

interface Options {
  admin?: boolean;
  status?: number;
}

/** Wraps a handler: runs the admin check, turns its result into JSON and HttpErrors into error responses. */
export function handler<C>(fn: (req: Request, ctx: C) => unknown, { admin = false, status = 200 }: Options = {}) {
  return async (req: Request, ctx: C): Promise<Response> => {
    try {
      if (admin) checkAdmin(req);
      const result = await fn(req, ctx);
      return result instanceof Response ? result : Response.json(result, { status });
    } catch (e) {
      if (e instanceof HttpError) return Response.json({ detail: e.detail }, { status: e.status });
      throw e;
    }
  };
}

export async function jsonBody(req: Request): Promise<Record<string, unknown>> {
  const data = await req.json().catch(() => undefined);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new HttpError(422, { errors: [{ loc: [], msg: 'Input should be a valid dictionary or object' }] });
  }
  return data as Record<string, unknown>;
}

export async function uploadedFile(req: Request, maxBytes: number): Promise<Buffer> {
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof Blob)) throw new HttpError(422, { errors: [{ loc: ['file'], msg: 'Field required' }] });
  if (file.size > maxBytes) throw new HttpError(413, 'That photo is over 25 MB. Export a smaller JPEG and try again.');
  return Buffer.from(await file.arrayBuffer());
}
