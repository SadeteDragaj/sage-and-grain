import { listRecipes } from '../../../server/api';
import { handler } from '../../../server/http';

export const GET = handler((req) => listRecipes(new URL(req.url).searchParams));
