import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { PostsPage } from './routes/PostsPage';
import { EditorPage } from './routes/EditorPage';
import { LoginPage } from './routes/LoginPage';

function App() {
  const navigate = useNavigate();
  const atList = useLocation().pathname === '/posts';
  return (
    <div className="app-shell">
      <header className="app-header">
        <strong>jun-devlog editor</strong>
        {!atList && <button type="button" className="back-btn" onClick={() => navigate(-1)}>← 뒤로</button>}
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/posts" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/posts" element={<PostsPage />} />
          <Route path="/editor/*" element={<EditorPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
