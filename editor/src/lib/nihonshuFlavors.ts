// Nihonshu (日本酒) flavor/aroma vocabulary for the tasting-note flavorTags autocomplete.
// Storage = the ko `label` (never the slug). `slug` is internal-only: React key, dedup,
// future grouping. `category` groups the flat v1 dropdown (grouping UI is a later phase).
// Free text is always allowed — this list only powers suggestions.

export interface NihonshuFlavor {
  slug: string;
  label: string;
  category: string;
}

export const NIHONSHU_FLAVORS: NihonshuFlavor[] = [
  // 과실향 (fruit)
  { slug: 'apple-pear', label: '사과·배향', category: '과실향' },
  { slug: 'melon', label: '멜론향', category: '과실향' },
  { slug: 'banana', label: '바나나향', category: '과실향' },
  { slug: 'lychee-peach', label: '리치·백도향', category: '과실향' },
  { slug: 'pineapple', label: '파인애플향', category: '과실향' },
  { slug: 'muscat', label: '청포도·머스캣향', category: '과실향' },
  { slug: 'citrus-yuzu', label: '감귤·유자향', category: '과실향' },
  { slug: 'strawberry', label: '딸기향', category: '과실향' },
  { slug: 'ripe-fruit', label: '잘 익은 과실향', category: '과실향' },
  // 꽃·긴죠향 (floral / ginjo aromatics)
  { slug: 'ginjo', label: '화사한 긴죠향', category: '꽃·긴죠향' },
  { slug: 'cherry-blossom', label: '벚꽃향', category: '꽃·긴죠향' },
  { slug: 'lily', label: '백합향', category: '꽃·긴죠향' },
  { slug: 'acacia-honey', label: '아카시아꿀향', category: '꽃·긴죠향' },
  { slug: 'rose', label: '장미향', category: '꽃·긴죠향' },
  { slug: 'herbal', label: '허브·민트향', category: '꽃·긴죠향' },
  // 쌀·곡물 (rice / grain)
  { slug: 'steamed-rice', label: '갓 지은 쌀밥향', category: '쌀·곡물' },
  { slug: 'cooked-rice', label: '찐쌀향', category: '쌀·곡물' },
  { slug: 'koji', label: '누룩향(코지)', category: '쌀·곡물' },
  { slug: 'grain', label: '곡물향', category: '쌀·곡물' },
  { slug: 'mochi', label: '떡·모찌향', category: '쌀·곡물' },
  { slug: 'sake-kasu', label: '술지게미향(사케카스)', category: '쌀·곡물' },
  // 유제품 (dairy)
  { slug: 'yogurt', label: '요구르트향', category: '유제품' },
  { slug: 'fresh-cream', label: '프레시 크림향', category: '유제품' },
  { slug: 'condensed-milk', label: '연유향', category: '유제품' },
  { slug: 'cheese', label: '치즈 뉘앙스', category: '유제품' },
  // 견과·카라멜 (nutty / caramel)
  { slug: 'almond', label: '아몬드향', category: '견과·카라멜' },
  { slug: 'roasted-nut', label: '볶은 견과향', category: '견과·카라멜' },
  { slug: 'caramel', label: '카라멜향', category: '견과·카라멜' },
  { slug: 'brown-sugar', label: '흑설탕향', category: '견과·카라멜' },
  { slug: 'vanilla', label: '바닐라향', category: '견과·카라멜' },
  { slug: 'toffee', label: '토피·버터스카치향', category: '견과·카라멜' },
  // 숙성·히네 (aged / hineka)
  { slug: 'aged', label: '숙성향(히네카)', category: '숙성·히네' },
  { slug: 'sherry', label: '셰리향', category: '숙성·히네' },
  { slug: 'soy-sauce', label: '간장 뉘앙스', category: '숙성·히네' },
  { slug: 'mushroom-earth', label: '버섯·흙내음', category: '숙성·히네' },
  { slug: 'dried-hay', label: '건초향', category: '숙성·히네' },
  { slug: 'dried-fruit', label: '건과일향', category: '숙성·히네' },
  // 단맛 (sweetness)
  { slug: 'subtle-sweet', label: '은은한 단맛', category: '단맛' },
  { slug: 'clear-sweet', label: '또렷한 단맛', category: '단맛' },
  { slug: 'honey-sweet', label: '꿀 같은 단맛', category: '단맛' },
  // 산미 (acidity)
  { slug: 'crisp-acid', label: '산뜻한 산미', category: '산미' },
  { slug: 'bright-acid', label: '상큼한 산미', category: '산미' },
  { slug: 'lactic', label: '젖산 뉘앙스', category: '산미' },
  { slug: 'malic', label: '사과산 같은 산미', category: '산미' },
  // 감칠맛·미네랄 (umami / mineral)
  { slug: 'umami', label: '감칠맛(우마미)', category: '감칠맛·미네랄' },
  { slug: 'mineral', label: '미네랄감', category: '감칠맛·미네랄' },
  { slug: 'bitter', label: '은은한 쓴맛', category: '감칠맛·미네랄' },
  // 질감·후미 (texture / finish)
  { slug: 'silky', label: '매끄러운 질감', category: '질감·후미' },
  { slug: 'creamy', label: '크리미한 질감', category: '질감·후미' },
  { slug: 'dry-finish', label: '드라이한 후미', category: '질감·후미' },
  { slug: 'clean-finish', label: '깔끔한 후미(키레)', category: '질감·후미' },
  { slug: 'long-finish', label: '여운이 긴 후미', category: '질감·후미' },
  { slug: 'sparkling', label: '탄산·발포감', category: '질감·후미' },
  { slug: 'full-body', label: '묵직한 바디', category: '질감·후미' },
  { slug: 'light-body', label: '가벼운 바디', category: '질감·후미' },
];

// Flat labels for the TagInput `suggestions` prop (SSOT-derived, so it can't drift).
export const NIHONSHU_FLAVOR_LABELS: string[] = NIHONSHU_FLAVORS.map((f) => f.label);
