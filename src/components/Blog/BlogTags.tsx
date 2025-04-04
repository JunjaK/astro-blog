import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

// @flow
import * as React from 'react';

import { v4 as uuidv4 } from 'uuid';

type Props = {
  tags: string[];
  badgeClick?: (tag: string) => void;
};
function makeKey(tag: string) {
  return uuidv4() + tag;
}
export default function BlogTags({ tags, badgeClick }: Props) {
  return (
    <ScrollArea className="scroll-area">
      <div className="tags-wrapper">
        {tags.map((tag) => (
          <Badge
            variant="secondary"
            className="rounded-md tag"
            key={makeKey(tag)}
            onClick={() => badgeClick && badgeClick(tag)}
          >
            {tag}
          </Badge>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
