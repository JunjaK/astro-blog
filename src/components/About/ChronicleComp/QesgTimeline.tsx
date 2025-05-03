import type { StringKeyType } from '@/types/commonType.ts';
import { EachProject } from '@/components/About/ChronicleComp/EachProject.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardDescription, CardTitle } from '@/components/ui/card.tsx';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { $theme } from '@/store/system.ts';
import { Icon } from '@iconify/react';
import { useStore } from '@nanostores/react';
import { motion } from 'framer-motion';
// @flow
import * as React from 'react';
import { useEffect, useState } from 'react';

type Props = {
  isOpen: StringKeyType<boolean>;
  handleOpenChange: (key: string) => void;
};

export function QesgTimeline({ isOpen, handleOpenChange }: Props) {
  const theme = useStore($theme);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  function projectList(mode: string) {
    return [
    ];
  }

  const collapsibleVariants = {
    open: { height: 'auto', opacity: 1 },
    closed: { height: 0, opacity: 0 },
  };

  return (
    <div>
      <Collapsible
        open={isOpen.twoz3rd}
        onOpenChange={() => handleOpenChange('twoz3rd')}
        className="space-y-2"
      >
        <div className="flex items-center justify-between collapsible">
          <div className="text-md font-semibold">
            2025.04 ~ Present
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-9 p-0">
              {isOpen.twoz3rd
                ? (<Icon icon="mingcute:up-line" className="w-4 h-4" />)
                : (<Icon icon="mingcute:down-line" className="w-4 h-4" />)}
              <span className="sr-only">Toggle</span>
            </Button>
          </CollapsibleTrigger>
        </div>
        <motion.div
          initial="closed"
          animate={isOpen.twoz3rd ? 'open' : 'closed'}
          variants={collapsibleVariants}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <CollapsibleContent className="space-y-2">
            <Card className="project-card">
              <CardTitle className="px-4 pt-4">
                QESG 매니저
              </CardTitle>
              <CardDescription className="px-4 mt-1 project-card-desc">
                QESG에서 프론트엔드 개발자로 일하고 있습니다.
              </CardDescription>
              <Separator className="mt-4" />
              <ul className="p-4">
                {projectList(theme).map((project, idx) => {
                  return (
                    <li className="" key={`twoz-3rd-project-${project.title}`}>
                      <EachProject {...project}></EachProject>
                      {projectList(theme).length - 1 === idx || <Separator className="my-4" />}
                    </li>
                  );
                })}
              </ul>
            </Card>
          </CollapsibleContent>
        </motion.div>
      </Collapsible>
    </div>
  );
}
