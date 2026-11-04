import { listCategories } from '../../../server/api';
import { handler } from '../../../server/http';

export const GET = handler(() => listCategories());
