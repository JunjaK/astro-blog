import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

// Posts list = status dashboard. Shows seeded legacy posts + (later) editor-born.
export function PostsPage() {
  const posts = useQuery({ queryKey: ['posts'], queryFn: api.posts, retry: false });

  return (
    <section>
      <div className="row">
        <h1>글 {posts.data ? `(${posts.data.length})` : ''}</h1>
        <Link to="/editor/new" className="post-list"><span>+ 새 글</span></Link>
      </div>
      {posts.isLoading && <p className="muted">불러오는 중…</p>}
      {posts.isError && <p className="muted">API 오프라인 — 서버를 켜세요.</p>}
      <ul className="post-table">
        {posts.data?.map((p) => (
          <li key={p.id}>
            <span className="post-cat">{p.category}</span>
            <Link to={`/editor/${p.id}`} className="post-title">{p.title || p.slug}</Link>
            <span className={`badge ${p.source === 'legacy' ? 'down' : 'ok'}`}>{p.source}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
