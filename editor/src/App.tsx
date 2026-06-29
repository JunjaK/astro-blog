import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { PostsPage } from './routes/PostsPage';
import { EditorPage } from './routes/EditorPage';
import { LoginPage } from './routes/LoginPage';

function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <strong>jun-devlog editor</strong>
        <nav>
          <NavLink to="/posts">Posts</NavLink>
          <NavLink to="/login">Login</NavLink>
        </nav>
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
