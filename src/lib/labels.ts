import type { Diet, Difficulty, Meal, Sort } from './types';

export const DIET_LABELS: Record<Diet, string> = {
  'gluten-free': 'Gluten-Free',
  vegan: 'Vegan',
  vegetarian: 'Vegetarian',
  'dairy-free': 'Dairy-Free',
  'high-protein': 'High-Protein',
};
export const MEAL_LABELS: Record<Meal, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
  dessert: 'Dessert',
};
export const DIFFICULTY_LABELS: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', advanced: 'Advanced' };
export const SORT_LABELS: Record<Sort, string> = { newest: 'Newest', popular: 'Most popular', quickest: 'Quickest' };
