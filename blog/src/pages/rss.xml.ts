import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import dayjs from 'dayjs';

export async function GET(context: APIContext) {
  const posts = await getCollection('blog');
  posts.sort((a, b) => dayjs(b.data.created).unix() - dayjs(a.data.created).unix());

  return rss({
    title: 'Jun Devlog',
    description: 'Personal developer blog by Jun — web development, game development, and more',
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.created,
      description: post.data.description || [post.data.title, post.data.category, ...(post.data.tags || [])].filter(Boolean).join(' | '),
      link: `/blog/${post.id}`,
      categories: post.data.tags || [],
    })),
  });
}
