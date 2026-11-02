// Placeholder tints used until real photos are added (see components/Photo.tsx).
const RECIPE_TONES: Record<string, string> = {
  'vegan-chickpea-curry': 'curry',
  'gluten-free-banana-oat-pancakes': 'pancakes',
  'mediterranean-quinoa-bowl': 'quinoa',
  'gluten-free-brownies': 'brownies',
  'vegan-red-lentil-soup': 'lentil',
  'roasted-vegetable-salad': 'roast',
  'overnight-oats-berries': 'oats',
  'high-protein-tofu-bowl': 'tofu',
  'healthy-avocado-toast': 'avocado',
  'peanut-butter-energy-bites': 'bites',
};

export function toneFor(slug: string) {
  return RECIPE_TONES[slug] ?? 'green';
}
