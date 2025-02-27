export function getBasePathWithUrl(src?: string) {
  if (src == null)
    return '';
  if (import.meta.env.MODE === 'dev')
    return `https://www.jun-devlog.win${src}`;
  return `${src}`;
}
