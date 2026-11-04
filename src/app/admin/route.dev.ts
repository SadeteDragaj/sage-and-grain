import { handler } from '../../server/http';
import { adminFile } from './files';

export const GET = handler(() => adminFile(['index.html']), { admin: true });
