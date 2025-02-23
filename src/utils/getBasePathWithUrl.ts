export function getBasePathWithUrl(src: string) {
  if (import.meta.env.MODE === 'dev')
    return `https://www.jun-devlog.win${src}`;
  return `${src}`;
}
