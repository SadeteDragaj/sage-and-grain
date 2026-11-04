import { handler } from '../../../server/http';
import { adminFile } from '../files';

export const GET = handler(async (_req, { params }: { params: Promise<{ path: string[] }> }) => adminFile((await params).path), {
  admin: true,
});
