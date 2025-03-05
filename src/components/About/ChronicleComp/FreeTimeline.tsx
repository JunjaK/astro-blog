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

export function FreeTimeline({ isOpen, handleOpenChange }: Props) {
  const theme = useStore($theme);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  function projectList(mode: string) {
    return [
      {
        title: 'Yosul',
        duration: '2024.06 ~ Present',
        desc: '국내에 전문적인 주류 리뷰 커뮤니티가 없어 우리가 한번 만들어보자는 생각하에 진행하고 있는 프로젝트.\n구성원은 모두 전/현직 직장인으로 사이드 프로젝트 겸 진행하고 있습니다.\n차별점으로는 주류 리뷰를 좀 더 디테일하게 작성할 수 있다는 점과 주류 위키(현재 개발 중...)를 통하여 술에 대한 정보를 사용자들이 자유롭게 추가할 수 있다는 점입니다.\n프론트엔드 및 마크업 작업을 맡아서 진행 중입니다.',
        techStackIcon: isHydrated
          ? [
              { iconUrl: `/images/icon/tech-stack/${mode}/typescript.svg`, techName: 'Typescript' },
              { iconUrl: `/images/icon/tech-stack/${mode}/nextdotjs.svg`, techName: 'Next' },
              { iconUrl: `/images/icon/tech-stack/${mode}/graphql.svg`, techName: 'GraphQL' },
              { iconUrl: `/images/icon/tech-stack/${mode}/tailwindcss.svg`, techName: 'Tailwind CSS' },
              { iconUrl: `/images/icon/tech-stack/${mode}/pm2.svg`, techName: 'PM2' },
              { iconUrl: `/images/icon/tech-stack/${mode}/nginx.svg`, techName: 'NGINX' },
              { iconUrl: `/images/icon/tech-stack/${mode}/github.svg`, techName: 'GitHub Action' },
            ]
          : [],
      },
      { title: 'Blog', duration: '2025.01 ~ Present', desc: '현재 보고 있는 이 블로그로, 위에 소개글에 나와있는대로 새로운 기술을 써서 개인 블로그를 만들어보자라는 마인드로 진행하고 있는 프로젝트.\n시간이 날 때 Blog와 Playground에 게시글을 올릴 예정입니다.', techStackIcon: isHydrated
        ? [
            { iconUrl: `/images/icon/tech-stack/${mode}/typescript.svg`, techName: 'Typescript' },
            { iconUrl: `/images/icon/tech-stack/${mode}/astro.svg`, techName: 'Astro' },
            { iconUrl: `/images/icon/tech-stack/${mode}/react.svg`, techName: 'React' },
            { iconUrl: `/images/icon/tech-stack/${mode}/tailwindcss.svg`, techName: 'Tailwind CSS' },
            { iconUrl: `/images/icon/tech-stack/${mode}/framer.svg`, techName: 'Framer' },
            { iconUrl: `/images/icon/tech-stack/${mode}/nginx.svg`, techName: 'NGINX' },
            { iconUrl: `/images/icon/tech-stack/${mode}/docker.svg`, techName: 'Docker' },
            { iconUrl: `/images/icon/tech-stack/${mode}/github.svg`, techName: 'GitHub Action' },
          ]
        : [] },
    ];
  }

  const collapsibleVariants = {
    open: { height: 'auto', opacity: 1 },
    closed: { height: 0, opacity: 0 },
  };

  return (
    <div>
      <Collapsible
        open={isOpen.free}
        onOpenChange={() => handleOpenChange('free')}
        className="space-y-2"
      >
        <div className="flex items-center justify-between collapsible">
          <div className="text-md font-semibold">
            2024.09 ~ Present
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-9 p-0">
              {isOpen.free
                ? (<Icon icon="mingcute:up-line" className="w-4 h-4" />)
                : (<Icon icon="mingcute:down-line" className="w-4 h-4" />)}
              <span className="sr-only">Toggle</span>
            </Button>
          </CollapsibleTrigger>
        </div>
        <motion.div
          initial="closed"
          animate={isOpen.free ? 'open' : 'closed'}
          variants={collapsibleVariants}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <CollapsibleContent className="space-y-2">
            <Card className="project-card">
              <CardTitle className="px-4 pt-4">
                Free
              </CardTitle>
              <CardDescription className="px-4 mt-1 project-card-desc">
                2024년 8월 퇴사 이후에는 회사 일에 바빠서 제대로 즐기지 못했던 여행이나 게임들을 하며 시간을 보냈습니다.
                {'\n'}
                특히 24.11.28 ~ 24.12.24 기간에는 버킷리스트 중 하나였던 일본 전국 일주를 다녀왔습니다.
                {'\n'}
                그에 대한 자세한 사항은 블로그에 일주기 포스트에서 확인할 수 있습니다.
                {'\n'}
                긴 휴식기를 마치고 현재는 개인 공부 및 프로젝트를 진행하며 재 취직을 준비하고 있습니다.
              </CardDescription>
              <Separator className="mt-4" />
              <ul className="p-4">
                {projectList(theme).map((project, idx) => {
                  return (
                    <li className="" key={`free-project-${project.title}`}>
                      <EachProject {...project}></EachProject>
                      {projectList(theme).length - 1 === idx || <Separator className="my-4" /> }
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
