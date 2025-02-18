import type { TechIconType } from '@/types/commonType.ts';
import { TechIcon } from '@/components/About/TechStackComp/TechIcon.tsx';
// @flow
import * as React from 'react';

type Props = {
  title: string;
  duration: string;
  desc: string;
  techStackIcon: TechIconType[];
};
export function EachProject({ title, duration, desc, techStackIcon }: Props) {
  return (
    <div className="project-card-content">
      <h4>
        {title}
      </h4>
      <div className="text-muted-foreground text-sm mt-1">
        {duration}
      </div>
      <p className="text-neutral-600 dark:text-neutral-300">
        {desc}
      </p>
      <div className="flex gap-1 items-center">
        <div className="text-muted-foreground text-sm">
          Used:
        </div>
        {techStackIcon.map((icon) => (
          <TechIcon
            key={`project-used-${icon.techName}`}
            iconUrl={icon.iconUrl}
            techName={icon.techName}
            iconSize="w-4 h-4"
            backgroundSize="w-6 h-6"
            hoverSize="p-1 text-sm"
          />
        ))}
      </div>
    </div>
  );
}
