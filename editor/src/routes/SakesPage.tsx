import { Navigate, Outlet, useNavigate, useParams } from 'react-router-dom';
import { BrandList } from './sakes/BrandPanel';
import { BreweryList } from './sakes/BreweryPanel';
import { SakeList } from './sakes/SakePanel';

// 사케/브랜드/양조장 마스터 관리 — 세그먼트 토글 1라우트(/sakes/:kind) + 자식 라우트(/sakes/:kind/:id)
// 편집뷰. 탭 순서는 데이터 계층 순(蔵元 → 브랜드 → 사케)의 역순 = 자주 쓰는 것부터.
// 탭 전환은 이제 라우트 전환(navigate)이다 — 로컬 tab state 없음, 컴포넌트 unmount가 상태를 초기화한다.
const TABS = [
  { key: 'sake', label: '사케' },
  { key: 'brand', label: '브랜드' },
  { key: 'brewery', label: '양조장' },
] as const;
type Kind = typeof TABS[number]['key'];

// `:kind` 라우트 파라미터 게이트 — 알 수 없는/누락된 값이면 /sakes/sake로 리다이렉트한다.
// 순수 함수로 분리해 라우터 하네스 없이 테스트 가능(shared.test.ts의 countLabel과 동일 패턴).
export function isSakeKind(k: string | undefined): k is Kind {
  return TABS.some((t) => t.key === k);
}

export function SakesPage() {
  const { kind } = useParams<{ kind: string }>();
  const navigate = useNavigate();

  if (!isSakeKind(kind)) return <Navigate to="/sakes/sake" replace />;

  return (
    <section>
      <div className="seg-toggle" role="tablist" aria-label="관리 대상">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`tab-${t.key}`}
            aria-controls={`panel-${t.key}`}
            aria-selected={kind === t.key}
            className={kind === t.key ? 'seg seg-on' : 'seg'}
            data-testid={`sakes-tab-${t.key}`}
            onClick={() => navigate(`/sakes/${t.key}`)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${kind}`} aria-labelledby={`tab-${kind}`} tabIndex={0}>
        {kind === 'sake' && <SakeList />}
        {kind === 'brand' && <BrandList />}
        {kind === 'brewery' && <BreweryList />}
      </div>
      <Outlet />
    </section>
  );
}
