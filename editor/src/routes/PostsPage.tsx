import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ListState } from '@/components/ListState';
import { Pager, usePager } from '@/components/Pager';
import { api } from '../lib/api';

// Posts list = status dashboard. Shows seeded legacy posts + editor-born ones.
export function PostsPage() {
  const posts = useQuery({ queryKey: ['posts'], queryFn: api.posts, retry: false });
  const items = posts.data ?? [];
  const { visible, remaining, more } = usePager(items, 30);

  return (
    <section>
      <div className="row">
        <h1>글 {posts.data ? `(${items.length})` : ''}</h1>
        <Button render={<Link to="/editor/new" />} data-testid="posts-new-button">+ 새 글</Button>
      </div>
      <ListState
        isLoading={posts.isLoading}
        isError={posts.isError}
        total={items.length}
        shown={visible.length}
        emptyText="아직 글이 없습니다. '+ 새 글'로 첫 글을 작성하세요."
        query=""
      />
      {visible.length > 0 && (
        <ul className="post-table sakes-list">
          {visible.map((p, i) => (
            <li key={p.id}>
              <Link to={`/editor/${p.id}`} className="row-btn" data-testid={`posts-row-${i}`}>
                <span className="post-cat">{p.category}</span>
                <span className="post-title">{p.title || p.slug}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pager remaining={remaining} onMore={more} />
    </section>
  );
}
