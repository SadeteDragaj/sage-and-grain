import { MAX_UPLOAD_BYTES, uploadArticlePhoto } from '../../../../../server/admin';
import { handler, uploadedFile } from '../../../../../server/http';

export const POST = handler(
  async (req, { params }: { params: Promise<{ slug: string }> }) =>
    uploadArticlePhoto((await params).slug, await uploadedFile(req, MAX_UPLOAD_BYTES)),
  { admin: true },
);
