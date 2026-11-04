import { loadRecipes } from '../../../server/content';
import { handler } from '../../../server/http';

export const GET = handler(() => ({ ok: true, recipes: loadRecipes().length }));
