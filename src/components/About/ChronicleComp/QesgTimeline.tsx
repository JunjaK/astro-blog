import type { StringKeyType } from '@/types/commonType.ts';
import { Icon } from '@iconify/react';
import { useStore } from '@nanostores/react';
import { motion } from 'framer-motion';
// @flow
import * as React from 'react';
import { useEffect, useState } from 'react';
import { EachProject } from '@/components/About/ChronicleComp/EachProject.tsx';
import { Button } from '@/components/ui/button.tsx';

import { Card, CardDescription, CardTitle } from '@/components/ui/card.tsx';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { $theme } from '@/store/system.ts';

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
      {
        title: 'ERT Data Management System',
        duration: '2025.09 ~ Present',
        desc: 'ESG 데이터를 관리하는 시스템을 구축하는 프로젝트입니다.\n ESG 데이터를 수집은 보통 excel + 이메일로 관리하여 중앙 관리시스템이 없어 불편하다는 니즈에 의해 개발을 시작했습니다.\n초기 요구사항 및 기획을 바탕으로 DB 설계, UI/UX, 기능 설계, 프론트엔드 메인 개발을 맡아서 진행하고 있습니다. 프로젝트의 개발 PM이기도 합니다.\n 데이터 편집, 증빙, 결재 라인을 편하게 처리하기 위하여 엑셀과 유사한 인터페이스 제공, 대용량 편집을 편하게 하기 위하여 Handsontable을 바탕으로 상당한 기능 커스텀을 단행했습니다.',
        techStackIcon: [
          { iconUrl: `/images/icon/tech-stack/${mode}/typescript.svg`, techName: 'Typescript' },
          { iconUrl: `/images/icon/tech-stack/${mode}/nuxt.svg`, techName: 'Nuxt' },
          { iconUrl: `/images/icon/tech-stack/light/unocss.svg`, techName: 'Uno CSS' },
          { iconUrl: `/images/icon/tech-stack/light/naive-ui.svg`, techName: 'Naive UI' },
          { iconUrl: `/images/icon/tech-stack/light/handsontable.png`, techName: 'Handsontable' },
          { iconUrl: `/images/icon/tech-stack/light/vitest.svg`, techName: 'Vitest' },
          { iconUrl: `/images/icon/tech-stack/light/playwright.svg`, techName: 'Playwright' },
          { iconUrl: `/images/icon/tech-stack/${mode}/github.svg`, techName: 'GitHub' },
          { iconUrl: `/images/icon/tech-stack/light/claude-ai-icon.svg`, techName: 'Claude Code' },
          { iconUrl: `/images/icon/tech-stack/${mode}/amazons3.svg`, techName: 'S3' },
          { iconUrl: `/images/icon/tech-stack/${mode}/mysql.svg`, techName: 'mysql' },
          { iconUrl: `/images/icon/tech-stack/${mode}/swagger.svg`, techName: 'Swagger' },
        ],
      },
      {
        title: 'Custom Assessment',
        duration: '2025.04 ~ Present',
        desc: 'ESG 평가 플랫폼을 유지, 신규 평가 건을 대응하는 프로젝트입니다. 입사 초에 온보딩을 이 프로젝트를 담당하는 것으로 진행했고, 2개의 규모가 큰 평가를 위한 신규 개발 및 운영 대응을 맡아서 진행했습니다.\n 처음으로 맡는 라이브 운영 서비스를 대응하는 것이라 비즈니스 로직을 파악에 초기 어려움은 있었으나 잘 적응하여 현재는 운영 대응에 익숙한 상태입니다.',
        techStackIcon: [
          { iconUrl: `/images/icon/tech-stack/${mode}/javascript.svg`, techName: 'Javascript' },
          { iconUrl: `/images/icon/tech-stack/${mode}/vuedotjs.svg`, techName: 'Vue' },
          { iconUrl: `/images/icon/tech-stack/${mode}/mysql.svg`, techName: 'mysql' },
          { iconUrl: `/images/icon/tech-stack/${mode}/python.svg`, techName: 'Python' },
          { iconUrl: `/images/icon/tech-stack/${mode}/flask.svg`, techName: 'Flask' },
        ],
      },
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
