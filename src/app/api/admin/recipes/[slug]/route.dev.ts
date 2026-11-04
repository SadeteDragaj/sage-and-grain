import { deleteRecipe, getRecipe, updateRecipe } from '../../../../../server/admin';
import { handler, jsonBody } from '../../../../../server/http';

type Ctx = { params: Promise<{ slug: string }> };

export const GET = handler(async (_req, { params }: Ctx) => getRecipe((await params).slug), { admin: true });
export const PUT = handler(async (req, { params }: Ctx) => updateRecipe((await params).slug, await jsonBody(req)), { admin: true });
export const DELETE = handler(async (_req, { params }: Ctx) => deleteRecipe((await params).slug), { admin: true });
