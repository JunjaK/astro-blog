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
      <p className="text-zinc-700 dark:text-zinc-300">
        {desc}
      </p>
      {/* flex-wrap 필수 — nowrap 이면 스택이 8개만 넘어가도 아이콘 줄이 카드 밖으로
          삐져나간다 (9개 기준 모바일에서 45px). 페이지 가로 스크롤은 안 생겨서
          눈으로만 깨져 보인다. */}
      <div className="flex flex-wrap gap-1 items-center min-w-0">
        <div className="text-muted-foreground text-sm shrink-0">
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
