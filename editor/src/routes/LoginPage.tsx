import { useState } from 'react';

// Skeleton login. Milestone ① wires POST /editor-api/auth/login
// (argon2id via Bun.password) → httpOnly session cookie.
export function LoginPage() {
  const [password, setPassword] = useState('');
  return (
    <section className="login-page">
      <h1>로그인</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          // TODO(milestone①): POST /editor-api/auth/login
        }}
      >
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          data-testid="login-password-input"
          autoComplete="current-password"
        />
        <button type="submit" className="btn-primary" data-testid="login-submit-button">
          로그인
        </button>
      </form>
    </section>
  );
}
