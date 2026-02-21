import type { StringKeyType } from '@/types/commonType.ts';
import { motion } from 'framer-motion';

// @flow
import * as React from 'react';
import { FreeTimeline } from '@/components/About/ChronicleComp/FreeTimeline.tsx';
import { QesgTimeline } from '@/components/About/ChronicleComp/QesgTimeline';
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
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-4"
      >
        Timeline
      </motion.h2>
      <p className="text-muted-foreground mb-4">
        저는 주로 Vue.js를 사용하여 개발해온 5년차 프론트엔드 개발자입니다.
        <br />
        업무 외적으로 사이드 프로젝트를 통하여 React, Astro 등의 새로운 라이브러리들을 경험해보고 있습니다.
        <br />
        이하 현재까지의 경력사항 및 진행한 프로젝트입니다.
        <br />
        더 자세한 사항은
        {' '}
        <a href="https://silken-physician-30f.notion.site/1adc06a048a580dc97cfdb73e22b1393?pvs=4" target="_blank" rel="noopener noreferrer" className="resume-link ">이력서</a>
        를 참고해주세요.
      </p>

      <Timeline>
        <TimelineItem status="done">

          <TimelineHeading>QESG 매니저</TimelineHeading>
          <TimelineDot status="current" />
          <TimelineLine done />
          <TimelineContent>
            <QesgTimeline isOpen={isOpen} handleOpenChange={handleOpenChange} />

          </TimelineContent>
        </TimelineItem>
        <TimelineItem status="done">

          <TimelineHeading>Free</TimelineHeading>
          <TimelineDot status="default" />
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
