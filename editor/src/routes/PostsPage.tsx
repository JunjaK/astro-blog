import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

// Posts list = status dashboard (동기화됨 / 수정됨 / 새 초안). Skeleton: shows
// backend health + a placeholder entry. Milestone ① fills GET /posts.
export function PostsPage() {
  const health = useQuery({ queryKey: ['health'], queryFn: api.health, retry: false });

  return (
    <section>
      <div className="row">
        <h1>글</h1>
        <span className={`badge ${health.isSuccess ? 'ok' : 'down'}`}>
          API: {health.isLoading ? '확인 중…' : health.isSuccess ? 'online' : 'offline'}
        </span>
      </div>
      <p className="muted">
        DB(편집 SoT) ↔ git/MDX(발행) 모델. 목록·상태 배지는 마일스톤①에서 구현.
      </p>
      <ul className="post-list">
        <li>
          <Link to="/editor/new">+ 새 글 작성</Link>
        </li>
      </ul>
    </section>
  );
}
