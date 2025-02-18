import type { StringKeyType } from '@/types/commonType.ts';
import { FreeTimeline } from '@/components/About/ChronicleComp/FreeTimeline.tsx';

import { Twoz1stTimeline } from '@/components/About/ChronicleComp/Twoz1stTimeline.tsx';
import { Twoz2ndTimeline } from '@/components/About/ChronicleComp/Twoz2ndTimeline.tsx';
import { Twoz3rdTimeline } from '@/components/About/ChronicleComp/Twoz3rdTimeline.tsx';
import { UnivTimeline } from '@/components/About/ChronicleComp/UnivTimeline.tsx';
import {
  Timeline,
  TimelineContent,
  TimelineDot,
  TimelineHeading,
  TimelineItem,
  TimelineLine,
} from '@/components/ui/timeline';
import { $theme } from '@/store/system.ts';
import { useStore } from '@nanostores/react';
import { motion } from 'framer-motion';
// @flow
import * as React from 'react';

export function Chronicle() {
  const theme = useStore($theme);

  const [isOpen, setIsOpen] = React.useState<StringKeyType<boolean>>({
    free: true,
    twoz3rd: true,
    twoz2nd: true,
    twoz1st: true,
    univ: true,
  });

  function handleOpenChange(key: string) {
    setIsOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function usingTechList(mode: string) {
    return [
      { iconUrl: `/images/about/tech-stack/${mode}/javascript.svg`, techName: 'Javascript' },
      { iconUrl: `/images/about/tech-stack/${mode}/typescript.svg`, techName: 'Typescript' },
      { iconUrl: `/images/about/tech-stack/${mode}/vuedotjs.svg`, techName: 'Vue' },
      { iconUrl: `/images/about/tech-stack/${mode}/nuxt.svg`, techName: 'Nuxt' },
      { iconUrl: `/images/about/tech-stack/${mode}/react.svg`, techName: 'React' },
      { iconUrl: `/images/about/tech-stack/${mode}/tailwindcss.svg`, techName: 'Tailwind CSS' },
      { iconUrl: `/images/about/tech-stack/${mode}/chartdotjs.svg`, techName: 'Chart.js' },
      { iconUrl: `/images/about/tech-stack/${mode}/vite.svg`, techName: 'Vite' },
      { iconUrl: `/images/about/tech-stack/${mode}/pnpm.svg`, techName: 'pnpm' },
      { iconUrl: `/images/about/tech-stack/${mode}/nodedotjs.svg`, techName: 'Node.js' },
    ];
  }

  function learningTechList(mode: string) {
    return [
      { iconUrl: `/images/about/tech-stack/${mode}/react.svg`, techName: 'React' },
      { iconUrl: `/images/about/tech-stack/${mode}/nextdotjs.svg`, techName: 'Next' },
      { iconUrl: `/images/about/tech-stack/${mode}/astro.svg`, techName: 'Astro' },
      { iconUrl: `/images/about/tech-stack/${mode}/d3.svg`, techName: 'D3' },
      { iconUrl: `/images/about/tech-stack/${mode}/threedotjs.svg`, techName: 'Three.js' },
      { iconUrl: `/images/about/tech-stack/${mode}/graphql.svg`, techName: 'GraphQL' },
      { iconUrl: `/images/about/tech-stack/${mode}/bun.svg`, techName: 'Bun' },
      { iconUrl: `/images/about/tech-stack/${mode}/docker.svg`, techName: 'Docker' },
    ];
  }

  return (
    <div>
      <motion.h2>
        Timeline
      </motion.h2>
      <p className="text-muted-foreground mb-4">
        현재까지의 경력사항 및 진행한 프로젝트입니다.
      </p>

      <Timeline>
        <TimelineItem status="done">

          <TimelineHeading>Free</TimelineHeading>
          <TimelineDot status="current" />
          <TimelineLine done />
          <TimelineContent>
            <FreeTimeline isOpen={isOpen} handleOpenChange={handleOpenChange} />

          </TimelineContent>
        </TimelineItem>
        <TimelineItem status="done">
          <TimelineHeading>트웬티온스 선임</TimelineHeading>
          <TimelineDot status="default" />
          <TimelineLine done />
          <TimelineContent>
            <Twoz3rdTimeline isOpen={isOpen} handleOpenChange={handleOpenChange} />
          </TimelineContent>
        </TimelineItem>
        <TimelineItem status="done">
          <TimelineHeading>트웬티온스 전임</TimelineHeading>
          <TimelineDot status="default" />
          <TimelineLine done />
          <TimelineContent>
            <Twoz2ndTimeline isOpen={isOpen} handleOpenChange={handleOpenChange} />
          </TimelineContent>
        </TimelineItem>
        <TimelineItem status="done">
          <TimelineHeading>트웬티온스 인턴</TimelineHeading>
          <TimelineDot status="default" />
          <TimelineLine done />
          <TimelineContent>
            <Twoz1stTimeline isOpen={isOpen} handleOpenChange={handleOpenChange} />
          </TimelineContent>
        </TimelineItem>
        <TimelineItem status="done">
          <TimelineHeading>경희대학교 컴퓨터공학 학사</TimelineHeading>
          <TimelineDot status="default" />
          <TimelineLine done />
          <TimelineContent>
            <UnivTimeline isOpen={isOpen} handleOpenChange={handleOpenChange} />
          </TimelineContent>
        </TimelineItem>
      </Timeline>
    </div>
  );
}
