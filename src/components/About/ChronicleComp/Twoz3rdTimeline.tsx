import type { StringKeyType } from '@/types/commonType.ts';
import { EachProject } from '@/components/About/ChronicleComp/EachProject.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardDescription, CardTitle } from '@/components/ui/card.tsx';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { $theme } from '@/store/system.ts';
import { Icon } from '@iconify/react';
import { useStore } from '@nanostores/react';
// @flow
import * as React from 'react';
import { useEffect, useState } from 'react';

type Props = {
  isOpen: StringKeyType<boolean>;
  handleOpenChange: (key: string) => void;
};
export function Twoz3rdTimeline({ isOpen, handleOpenChange }: Props) {
  const theme = useStore($theme);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  function projectList(mode: string) {
    return [
      { title: '사내 공통 모듈화 프로젝트', duration: '2024.03 ~ 2024.08', desc: '사내에서 진행하고 있는 여러 프로젝트에서 반복되는 패턴, 모듈들이 많았지만 파편화되어있고 버전 컨트롤이 어려운 문제점이 있었습니다.\n이를 해결하기 위해 모듈들을 공통화하여 사내 Npm Nexus에 배포, 이를 각 프로젝트에서 npm install 하는 방식으로 변경하는 프로젝트입니다.\nMonorepo로 모듈 내에서 테스트할 수 있는 패키지도 포함하였습니다.', techStackIcon: isHydrated
        ? [
            { iconUrl: `/images/about/tech-stack/${mode}/typescript.svg`, techName: 'Typescript' },
            { iconUrl: `/images/about/tech-stack/${mode}/vuedotjs.svg`, techName: 'Vue' },
            { iconUrl: `/images/about/tech-stack/${mode}/vite.svg`, techName: 'Vite' },
            { iconUrl: `/images/about/tech-stack/${mode}/npm.svg`, techName: 'Npm workspace' },
            { iconUrl: `/images/about/tech-stack/${mode}/sonatype.svg`, techName: 'Sonatype Nexus' },
            { iconUrl: `/images/about/tech-stack/${mode}/wijmo.svg`, techName: 'Wijmo Grid' },
            { iconUrl: `/images/about/tech-stack/${mode}/gitlab.svg`, techName: 'Gitlab CI' },
          ]
        : [] },
      {
        title: 'FMS 리뉴얼',
        duration: '2024.02 ~ 2024.08',
        desc: '기존 Nuxt2로 개발되어있던 FMS를 TS, Vue3, Vite 기반으로 변경하고 디자인, 설계 부분도 변경하여 솔루션화하는 프로젝트입니다.\n웹, 모바일 버전이 있으며 해당 프로젝트 기반으로 이후 납품될 FMS가 구성되었습니다.\n해당 프로젝트에서 프론트엔드 쪽 리드 개발자를 담당하였습니다.',
        techStackIcon: isHydrated
          ? [
              { iconUrl: `/images/about/tech-stack/${mode}/typescript.svg`, techName: 'Typescript' },
              { iconUrl: `/images/about/tech-stack/${mode}/vuedotjs.svg`, techName: 'Vue' },
              { iconUrl: `/images/about/tech-stack/${mode}/vite.svg`, techName: 'Vite' },
              { iconUrl: `/images/about/tech-stack/${mode}/wijmo.svg`, techName: 'Wijmo Grid' },
              { iconUrl: `/images/about/tech-stack/${mode}/antdesign.svg`, techName: 'Ant Design Vue' },
              { iconUrl: `/images/about/tech-stack/${mode}/swagger.svg`, techName: 'Swagger CodeGen' },
              { iconUrl: `/images/about/tech-stack/${mode}/gitlab.svg`, techName: 'Gitlab CI' },
            ]
          : [],
      },
    ];
  }

  return (
    <div>
      <Collapsible
        open={isOpen.twoz3rd}
        onOpenChange={() => handleOpenChange('twoz3rd')}
        className="space-y-2"
      >
        <div className="flex items-center justify-between collapsible">
          <div className="text-md font-semibold">
            2024.02 ~ 2024.08
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
        <CollapsibleContent className="space-y-2">
          <Card className="project-card">
            <CardTitle className="px-4 pt-4">
              트웬티온스 선임
            </CardTitle>
            <CardDescription className="px-4 mt-1 project-card-desc">
              선임으로 승진 이후에는 기존의 역할에 이어서 추가로 회사 내의 프론트엔드 쪽에서 공통 부분을 조금 더 집중하여 개발하는 역할을 맡았습니다.
              {'\n'}
              아래는 선임시절 맡았던 주요 프로젝트들입니다.
            </CardDescription>
            <Separator className="mt-4" />
            <ul className="p-4">
              {projectList(theme).map((project, idx) => {
                return (
                  <li className="" key={`twoz-3rd-project-${project.title}`}>
                    <EachProject {...project}></EachProject>
                    {projectList(theme).length - 1 === idx || <Separator className="my-4" /> }
                  </li>
                );
              })}
            </ul>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
