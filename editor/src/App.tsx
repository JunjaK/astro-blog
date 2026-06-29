import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { auth } from './lib/api';
import { PostsPage } from './routes/PostsPage';
import { EditorPage } from './routes/EditorPage';
import { LoginPage } from './routes/LoginPage';

function AuthGuard() {
  const q = useQuery({ queryKey: ['auth', 'me'], queryFn: auth.me, retry: false, staleTime: 5 * 60_000 });
  if (q.isLoading) return <p className="muted">확인 중…</p>;
  if (!q.data) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function App() {
  return (
    <div className="app-shell">
      <header className="app-header"><strong>jun-devlog editor</strong></header>
      <main className="app-main">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AuthGuard />}>
            <Route path="/" element={<Navigate to="/posts" replace />} />
            <Route path="/posts" element={<PostsPage />} />
            <Route path="/editor/*" element={<EditorPage />} />
          </Route>
        </Routes>
      </main>
    </div>
  );
}

export default App;
