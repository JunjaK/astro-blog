import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

type Props = {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
};

type BadgeProps = {
  category: string;
  selectedCategory: string;
  onClick: () => void;
};

function StatedBadge({ category, selectedCategory, onClick }: BadgeProps) {
  return (
    <motion.div
      className="shrink-0"
      initial={false}
      animate={{
        scale: selectedCategory === category ? 1.1 : 1,
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      <Badge
        variant={selectedCategory === category ? 'default' : 'outline'}
        onClick={onClick}
        className="cursor-pointer"
      >
        {category}
      </Badge>
    </motion.div>
  );
}

export default function CategoryTags({ categories, selectedCategory, onSelectCategory }: Props) {
  // 줄바꿈 대신 가로 스크롤. flex-wrap + 고정 높이(h-[3rem])였을 때는 카테고리가 늘어나면
  // 둘째 줄이 그 높이 밖으로 밀려 아래 검색 영역에 잘렸다. py-1.5 는 badge 의 scale
  // 애니메이션이 스크롤 컨테이너에 잘리지 않게 하는 여백.
  return (
    <div className="flex items-center gap-2 overflow-x-auto overscroll-x-contain py-1.5">
      <div className="ml-1 shrink-0 font-medium text-sm tracking-wide text-muted-foreground">
        Categories:
      </div>
      {categories.map((category) => (
        <StatedBadge
          key={category}
          category={category}
          selectedCategory={selectedCategory}
          onClick={() => onSelectCategory(category)}
        />
      ))}
    </div>
  );
}
