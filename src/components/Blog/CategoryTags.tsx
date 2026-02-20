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
  return (
    <div className="flex flex-wrap gap-2 items-center h-[3rem]">
      <div className="ml-1 font-medium text-sm tracking-wide text-muted-foreground">
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
