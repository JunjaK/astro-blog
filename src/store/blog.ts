import { atom } from 'nanostores';

export const $category = atom('');
export const $tag = atom('');

export function setCategory(category: string) {
  $category.set(category);
}

export function setTag(tag: string) {
  $tag.set(tag);
}
