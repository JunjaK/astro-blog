import type { BlogFrontMatter } from '@/types/commonType.ts';
import type { MarkdownInstance } from 'astro';
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
// @flow
import * as React from 'react';
import { useEffect, useState } from 'react';

import { useForm } from 'react-hook-form';
import { z } from 'zod';

type SearchType = 'category' | 'title' | 'tag';
const formSchema = z.object({
  search: z.string().min(2).max(50),
  searchType: z.enum(['category', 'title', 'tag']),
});

type Props = {
  posts: MarkdownInstance<BlogFrontMatter>[];
};
export default function Articles({ posts }: Props) {
  const [articles, setArticles] = useState(posts);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      search: '',
      searchType: 'title',
    },
  });

  useEffect(() => {
    const query = new URLSearchParams(window.location.href.split('?')[1]);
    form.setValue('searchType', query.get('category') as SearchType ?? 'title');
    form.setValue('searchType', query.get('tag') as SearchType ?? 'title');
  }, []);

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    console.log(values);
  }

  function resetForm() {
    form.reset();
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
                  >
                    <FormControl>
                      <SelectTrigger className="w-[8rem] rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="title">Title</SelectItem>
                      <SelectItem value="category">Category</SelectItem>
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
                    <Input className="search-input rounded-lg" placeholder="검색어를 입력해주세요." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              variant="outline"
              size="icon"
              className="rounded-lg"
              type="button"
              onClick={resetForm}
            >
              <Icon icon="tabler:rotate" className="h-[1.5rem] w-[1.5rem] "></Icon>
            </Button>
          </form>
        </Form>
      </div>

      {articles.map((article) =>
        <EachArticle frontmatter={article.frontmatter} url={article.url} key={`${article.frontmatter.title}-${article.frontmatter.category}`} />,
      )}
    </div>
  );
}
