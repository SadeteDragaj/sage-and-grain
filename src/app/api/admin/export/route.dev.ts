import { exportNow } from '../../../../server/admin';
import { handler } from '../../../../server/http';

export const POST = handler(() => exportNow(), { admin: true });
