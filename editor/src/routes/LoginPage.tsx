import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { auth } from '../lib/api';

export function LoginPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const ok = await auth.login(password);
    setBusy(false);
    if (!ok) { setError(true); return; }
    // load-bearing: guard cached ['auth','me']=false on first load → invalidate to re-probe
    await qc.invalidateQueries({ queryKey: ['auth'] });
    navigate('/posts', { replace: true });
  };

  return (
    <section className="login-page">
      <h1>로그인</h1>
      <form onSubmit={onSubmit}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          data-testid="login-password-input"
          autoComplete="current-password"
        />
        <button type="submit" className="btn-primary" disabled={busy} data-testid="login-submit-button">
          로그인
          {/* 200ms 지연 후 표시 — 로컬처럼 빠른 응답에선 아예 안 보여 깜박임 제거 */}
          {busy && <span className="login-spinner" aria-hidden="true" />}
        </button>
      </form>
      {error && <p className="login-error" role="alert" data-testid="login-error">비밀번호가 올바르지 않습니다.</p>}
    </section>
  );
}
