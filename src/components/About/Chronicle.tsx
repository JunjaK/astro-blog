import type { StringKeyType } from '@/types/commonType.ts';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

import {
  Timeline,
  TimelineContent,
  TimelineDot,
  TimelineHeading,
  TimelineItem,
  TimelineLine,
} from '@/components/ui/timeline';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
// @flow
import * as React from 'react';

export function Chronicle() {
  const [isOpen, setIsOpen] = React.useState<StringKeyType<boolean>>({
    'free': true,
    'twoz-research-engineer': true,
    'twoz-associate-engineer': true,
    'twoz-intern': true,
    'univ': true,
  });

  function handleOpenChange(key: string) {
    setIsOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div>
      <motion.h2>
        Timeline
      </motion.h2>

      <Timeline>
        <TimelineItem status="done">

          <TimelineHeading>Free</TimelineHeading>
          <TimelineDot status="current" />
          <TimelineLine done />
          <TimelineContent>
            <Collapsible
              open={isOpen.free}
              onOpenChange={() => handleOpenChange('free')}
              className="w-[350px] space-y-2"
            >
              <div className="flex items-center justify-between space-x-4 px-4">
                <h4 className="text-sm font-semibold">
                  2024.09 ~ Now
                </h4>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-9 p-0">
                    {isOpen.free
                      ? (<Icon icon="mingcute:up-line" className="w-4 h-4" />)
                      : (<Icon icon="mingcute:down-line" className="w-4 h-4" />)}
                    <span className="sr-only">Toggle</span>
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="space-y-2">
                Content
              </CollapsibleContent>
            </Collapsible>
          </TimelineContent>
        </TimelineItem>
        <TimelineItem status="done">
          <TimelineHeading>트웬티온스 선임</TimelineHeading>
          <TimelineDot status="done" />
          <TimelineLine done />
          <TimelineContent>
            <Collapsible
              open={isOpen['twoz-research-engineer']}
              onOpenChange={() => handleOpenChange('twoz-research-engineer')}
              className="w-[350px] space-y-2"
            >
              <div className="flex items-center justify-between space-x-4 px-4">
                <h4 className="text-sm font-semibold">
                  2024.02 ~ 2024.08
                </h4>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-9 p-0">
                    {isOpen['twoz-research-engineer']
                      ? (<Icon icon="mingcute:up-line" className="w-4 h-4" />)
                      : (<Icon icon="mingcute:down-line" className="w-4 h-4" />)}
                    <span className="sr-only">Toggle</span>
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="space-y-2">
                Content
              </CollapsibleContent>
            </Collapsible>
          </TimelineContent>
        </TimelineItem>
        <TimelineItem status="done">
          <TimelineHeading>트웬티온스 전임</TimelineHeading>
          <TimelineDot status="done" />
          <TimelineLine done />
        </TimelineItem>
        <TimelineItem status="default">
          <TimelineHeading>트웬티온스 인턴</TimelineHeading>
          <TimelineDot status="done" />
          <TimelineLine done />
        </TimelineItem>
        <TimelineItem status="done">
          <TimelineHeading>경희대학교 컴퓨터공학</TimelineHeading>
          <TimelineDot status="done" />
          <TimelineLine done />
        </TimelineItem>
      </Timeline>
    </div>
  );
}
