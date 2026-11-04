// npm run content — checks content/*.json (diet-label rules included) after a hand edit.
// The same check runs on every build and every admin save.
import { ContentError, checkContent } from '../src/server/content';

try {
  console.log(checkContent());
} catch (e) {
  if (!(e instanceof ContentError)) throw e;
  console.error(e.message);
  process.exit(1);
}
