import { useParams } from 'react-router-dom';
import { BrandEdit } from './BrandPanel';
import { BreweryEdit } from './BreweryPanel';
import { SakeEdit } from './SakePanel';

// nested `:id` route element — dispatches to the entity-specific Edit gate based on the parent
// `:kind` param. `kind` is already validated one level up by SakesPage (invalid kind redirects
// before this ever renders), so an unrecognized value here just falls back to the sake panel.
export function SakeEditRoute() {
  const { kind, id } = useParams<{ kind: string; id: string }>();
  if (!id) return null;
  if (kind === 'brand') return <BrandEdit id={id} />;
  if (kind === 'brewery') return <BreweryEdit id={id} />;
  return <SakeEdit id={id} />;
}
