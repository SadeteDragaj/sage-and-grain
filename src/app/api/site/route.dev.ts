import { readSite } from '../../../server/content';
import { handler } from '../../../server/http';

export const GET = handler(() => readSite());
