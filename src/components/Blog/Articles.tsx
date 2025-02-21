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
import { useEffect, useState } from 'react';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FadeText } from '~/components/ui/fade-text';

type Props = {
  posts: CollectionEntry<'blog'>[];
};
const formSchema = z.object({
  search: z.string().min(2).max(50),
  searchType: z.enum(['category', 'title-tag']),

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
    {
      name: 'data.tags',
      weight: 0.3,
    },
  ],
};

export default function Articles({ posts }: Props) {
  const [articles, setArticles] = useState(posts);
  const [isSearchActive, setIsSearchActive] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      search: '',
      searchType: 'title-tag',
    },
  });

  const fuse = new Fuse(posts, fuseOptions);

  useEffect(() => {
    const query = new URLSearchParams(window.location.href.split('?')[1]);
    const category = query.get('category');
    const tag = query.get('tag');

    if (category != null) {
      form.setValue('searchType', 'category');
      form.setValue('search', category);
      onSubmit(form.getValues());
    }
    else if (tag != null) {
      form.setValue('searchType', 'title-tag');
      form.setValue('search', tag);
      onSubmit(form.getValues());
    }
    else {
      form.setValue('searchType', 'title-tag');
      form.setValue('search', '');
    }
  }, []);

  function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSearchActive(true);
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    if (values.searchType === 'category') {
      setArticles(posts.filter((post) => post.data.category === values.search));
    }
    else {
      const result = fuse.search(values.search);
      setArticles(
        result
          .map((r) => r.item)
          .sort((a, b) => dayjs(b.data.created).unix() - dayjs(a.data.created).unix()),
      );
    }
  }

  function resetForm() {
    form.reset();
    setIsSearchActive(false);
    setArticles(posts);
  }

  return (
    <div>
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
                      <SelectTrigger className="w-[7rem] rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="title-tag">Title & Tag</SelectItem>
                      <SelectItem value="category">Category</SelectItem>
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
    </div>
  );
}
