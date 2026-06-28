/* eslint-disable react-hooks/exhaustive-deps */
import type { CollectionEntry } from 'astro:content';
import EachArticle from '@/components/Blog/EachArticle';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { Icon } from '@/components/ui/icon';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FadeText } from '~/components/ui/fade-text';
import CategoryTags from './CategoryTags';
import SearchLoading from './SearchLoading';

type BlogPost = Omit<CollectionEntry<'blog'>, 'body'>;

type Props = {
  posts: BlogPost[];
  categories: string[];
};
const formSchema = z.object({
  search: z.string().min(2).max(50),
  searchType: z.enum(['tag', 'title-content']),
});

type PagefindResult = {
  id: string;
  data: () => Promise<{ url: string; excerpt: string; meta: Record<string, string> }>;
};

type Pagefind = {
  search: (query: string, options?: { filters?: Record<string, string | string[]> }) => Promise<{ results: PagefindResult[] }>;
  init: () => Promise<void>;
};

export default function Articles({ posts, categories }: Props) {
  const [mounted, setMounted] = useState(false);
  const [articles, setArticles] = useState(posts);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const pagefindRef = useRef<Pagefind | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const virtualizer = useWindowVirtualizer({
    count: articles.length,
    estimateSize: () => 176,
    overscan: 5,
    scrollMargin: listRef.current?.offsetTop ?? 0,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      search: '',
      searchType: 'title-content',
    },
  });

  useEffect(() => {
    async function loadPagefind() {
      try {
        const pagefindPath = `${window.location.origin}/pagefind/pagefind.js`;
        const pf = await import(/* @vite-ignore */ pagefindPath);
        await pf.init();
        pagefindRef.current = pf;
      }
      catch {
        // Pagefind not available (dev mode without prebuilt index)
      }
    }
    loadPagefind();
  }, []);

  const postsByUrl = useRef(
    new Map(posts.map((post) => [`/blog/${post.id}/`, post])),
  );

  const searchWithPagefind = useCallback(async (query: string): Promise<BlogPost[]> => {
    const pf = pagefindRef.current;
    if (!pf || !query) return posts;

    const search = await pf.search(query);
    const results = await Promise.all(
      search.results.map(async (r) => {
        const data = await r.data();
        return postsByUrl.current.get(data.url);
      }),
    );
    return results.filter((r): r is BlogPost => r != null);
  }, [posts]);

  const searchByTag = useCallback((query: string): BlogPost[] => {
    if (!query) return posts;
    const lowerQuery = query.toLowerCase();
    return posts.filter((post) =>
      post.data.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery)),
    );
  }, [posts]);

  const onSubmit = useCallback(async (values: z.infer<typeof formSchema>) => {
    setIsSearchActive(true);
    setIsSearching(true);

    const url = new URL(window.location.href);

    if (values.search !== '') {
      url.searchParams.set('type', values.searchType);
      url.searchParams.set('q', values.search);
    }

    let result: BlogPost[];
    if (values.search === '') {
      result = posts;
    }
    else if (values.searchType === 'tag') {
      result = searchByTag(values.search);
    }
    else {
      result = await searchWithPagefind(values.search);
    }

    if (selectedCategory !== '' && selectedCategory !== null) {
      url.searchParams.set('category', selectedCategory);
      setArticles(result.filter((post) => post.data.category === selectedCategory));
    }
    else {
      url.searchParams.delete('category');
      setArticles(result);
    }

    window.history.pushState({}, '', url);
    virtualizer.scrollToOffset(0);
    setTimeout(() => {
      setIsSearching(false);
    }, 500);
  }, [searchWithPagefind, searchByTag, setArticles, setIsSearchActive, selectedCategory, posts, virtualizer]);

  const searchCategory = useCallback((category: string) => {
    if (selectedCategory === category) {
      setSelectedCategory('');
    }
    else {
      setSelectedCategory(category);
    }
  }, [selectedCategory]);

  function resetForm() {
    form.reset();
    setIsSearchActive(false);
    setArticles(posts);
    setSelectedCategory('');
    const url = new URL(window.location.href);
    url.searchParams.delete('type');
    url.searchParams.delete('q');
    window.history.pushState({}, '', url);
    virtualizer.scrollToOffset(0);
  }

  useEffect(() => {
    if (mounted) {
      onSubmit({ search: form.getValues().search, searchType: form.getValues().searchType });
    }
  }, [selectedCategory]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const searchType = url.searchParams.get('type');
    const searchQuery = url.searchParams.get('q');
    const category = url.searchParams.get('category');

    if (searchType && searchQuery) {
      form.setValue('searchType', searchType as 'tag' | 'title-content');
      form.setValue('search', searchQuery);

      if (category !== null && category !== '') {
        searchCategory(category);
      }
      else {
        onSubmit(form.getValues());
      }
    }
    else if (category !== null && category !== '') {
      searchCategory(category);
    }
    else {
      form.setValue('searchType', 'title-content');
      form.setValue('search', '');
    }
    setMounted(true);
  }, []);

  return (
    <div className="relative">
      <CategoryTags categories={categories} selectedCategory={selectedCategory} onSelectCategory={searchCategory} />
      <div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="search-area">
            <FormField
              control={form.control}
              name="searchType"
              render={({ field }) => (
                <FormItem>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                    name={field.name}
                  >
                    <FormControl>
                      <SelectTrigger className="w-[9rem] rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="title-content">Title & Content</SelectItem>
                      <SelectItem value="tag">Tag</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="search"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input className="search-input rounded-lg" placeholder="검색어" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              variant="outline"
              size="icon"
              className="reset-btn rounded-lg"
              type="button"
              name="search-reset"
              aria-label="search-reset"
              onClick={resetForm}
            >
              <Icon icon="tabler:rotate" className="h-[1.5rem] w-[1.5rem] "></Icon>
            </Button>
          </form>
        </Form>
        {isSearchActive && (
          <div className="search-result">
            <FadeText
              className="transition ease-out text-neutral-400"
              direction="down"
              framerProps={{
                show: { transition: { delay: 0.1 } },
              }}
              text={`${articles.length}개의 해당하는 포스트를 찾았습니다.`}
            />
          </div>
        )}
      </div>

      <div className="relative">
        {isSearching && <SearchLoading />}
        {articles.length > 0 ? (
          <div
            ref={listRef}
            style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const article = articles[virtualRow.index];
              return (
                <div
                  key={`${article.data.title}-${article.data.category}`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start - virtualizer.options.scrollMargin}px)`,
                  }}
                >
                  <EachArticle
                    frontmatter={article.data}
                    url={`/blog/${article.id}`}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-result" aria-label="empty-result">
            <div>
              <Icon icon="mynaui:inbox-x" className="empty-icon" />
              <div className="desc">검색 결과가 없습니다.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
