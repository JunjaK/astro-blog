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
import { motion } from 'framer-motion';
// @flow
import * as React from 'react';

export function Chronicle() {
  const [isOpen, setIsOpen] = React.useState<StringKeyType<boolean>>({
    free: false,
    twoz3rd: false,
    twoz2nd: false,
    twoz1st: false,
    univ: false,
  });

  function handleOpenChange(key: string) {
    setIsOpen((prev) => ({ ...prev, [key]: !prev[key] }));
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
