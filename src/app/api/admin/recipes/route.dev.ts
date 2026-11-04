import { createRecipe, listRecipes } from '../../../../server/admin';
import { handler, jsonBody } from '../../../../server/http';

export const GET = handler(() => listRecipes(), { admin: true });
export const POST = handler(async (req) => createRecipe(await jsonBody(req)), { admin: true, status: 201 });
