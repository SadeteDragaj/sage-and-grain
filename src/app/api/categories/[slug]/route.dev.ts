import { categoryDetail } from '../../../../server/api';
import { handler } from '../../../../server/http';

export const GET = handler(async (_req, { params }: { params: Promise<{ slug: string }> }) => categoryDetail((await params).slug));
