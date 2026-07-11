import { Link, Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { auth } from './lib/api';
import { PostsPage } from './routes/PostsPage';
import { EditorPage } from './routes/EditorPage';
import { LoginPage } from './routes/LoginPage';
import { SakesPage } from './routes/SakesPage';

const navClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'nav-link nav-on' : 'nav-link');

function AuthGuard() {
  const q = useQuery({ queryKey: ['auth', 'me'], queryFn: auth.me, retry: false, staleTime: 5 * 60_000 });
  if (q.isLoading) return <p className="muted">확인 중…</p>;
  if (!q.data) return <Navigate to="/login" replace />;
  return <Outlet />;
}

// 세션이 유효하면(토큰 만료 전) /login 접근을 막고 /posts로 보냄. 만료되면 로그인 폼 노출.
function GuestGuard() {
  const q = useQuery({ queryKey: ['auth', 'me'], queryFn: auth.me, retry: false, staleTime: 5 * 60_000 });
  if (q.isLoading) return <p className="muted">확인 중…</p>;
  if (q.data) return <Navigate to="/posts" replace />;
  return <LoginPage />;
}

function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/posts" className="app-brand">jun-devlog editor</Link>
        <nav className="app-nav">
          <NavLink to="/posts" className={navClass}>글</NavLink>
          <NavLink to="/sakes" className={navClass}>사케</NavLink>
        </nav>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/login" element={<GuestGuard />} />
          <Route element={<AuthGuard />}>
            <Route path="/" element={<Navigate to="/posts" replace />} />
            <Route path="/posts" element={<PostsPage />} />
            <Route path="/sakes" element={<SakesPage />} />
            <Route path="/editor/*" element={<EditorPage />} />
          </Route>
        </Routes>
      </main>
    </div>
  );
}

export default App;
