import { MAX_UPLOAD_BYTES, uploadPhoto } from '../../../../../server/admin';
import { handler, uploadedFile } from '../../../../../server/http';

export const POST = handler(
  async (req, { params }: { params: Promise<{ slug: string }> }) => uploadPhoto((await params).slug, await uploadedFile(req, MAX_UPLOAD_BYTES)),
  { admin: true },
);
