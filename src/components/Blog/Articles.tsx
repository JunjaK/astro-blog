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
import { Icon } from '@iconify/react';
import dayjs from 'dayjs';
import Fuse from 'fuse.js';
import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FadeText } from '~/components/ui/fade-text';
import CategoryTags from './CategoryTags';

type Props = {
  posts: CollectionEntry<'blog'>[];
};
const formSchema = z.object({
  search: z.string().min(2).max(50),
  searchType: z.enum(['tag', 'title-content']),
});

const fuseOptions = {
  isCaseSensitive: false,
  includeScore: true,
  ignoreDiacritics: false,
  shouldSort: true,
  includeMatches: false,
  findAllMatches: false,
  minMatchCharLength: 2,
  location: 0,
  threshold: 0.15,
  distance: 100,
  useExtendedSearch: false,
  ignoreLocation: false,
  ignoreFieldNorm: false,
  fieldNormWeight: 1,
  keys: [
    'data.title',
    'data.body',
    {
      name: 'data.tags',
      weight: 0.3,
    },
  ],
};

export default function Articles({ posts }: Props) {
  const [mounted, setMounted] = useState(false);
  const [articles, setArticles] = useState(posts);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      search: '',
      searchType: 'title-content',
    },
  });

  const fuse = useMemo(() => new Fuse(posts, fuseOptions), [posts]);

  const onSubmit = useCallback((values: z.infer<typeof formSchema>) => {
    setIsSearchActive(true);

    // Update URL query parameters
    const url = new URL(window.location.href);

    if (values.search !== '') {
      url.searchParams.set('type', values.searchType);
      url.searchParams.set('q', values.search);
    }

    const result = values.search === '' ? posts.map((post) => ({ item: post })) : fuse.search(values.search);

    const sortedResult = result
      .map((r) => r.item)
      .sort((a, b) => dayjs(b.data.created).unix() - dayjs(a.data.created).unix());

    if (selectedCategory !== '' && selectedCategory !== null) {
      url.searchParams.set('category', selectedCategory);
      setArticles(sortedResult.filter((post) => post.data.category === selectedCategory));
    }
    else {
      url.searchParams.delete('category');
      setArticles(sortedResult);
    }

    window.history.pushState({}, '', url);
  }, [fuse, setArticles, setIsSearchActive, selectedCategory, posts]);

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
    // Clear URL query parameters
    const url = new URL(window.location.href);
    url.searchParams.delete('type');
    url.searchParams.delete('q');
    window.history.pushState({}, '', url);
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
    else {
      form.setValue('searchType', 'title-content');
      form.setValue('search', '');
    }
    setMounted(true);
  }, []);

  return (
    <div>
      <CategoryTags selectedCategory={selectedCategory} onSelectCategory={searchCategory} />
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

      {articles.map((article) => (
        <EachArticle
          frontmatter={article.data}
          url={`/blog/${article.slug}`}
          key={`${article.data.title}-${article.data.category}`}
        />
      ),
      )}
      {articles.length === 0 && (
        <div className="empty-result" aria-label="empty-result">
          <div>
            <Icon icon="mynaui:inbox-x" className="empty-icon" />
            <div className="desc">
              검색 결과가 없습니다.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
