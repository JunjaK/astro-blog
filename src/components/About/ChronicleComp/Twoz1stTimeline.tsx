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
export function Twoz1stTimeline({ isOpen, handleOpenChange }: Props) {
  const theme = useStore($theme);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  function projectList(mode: string) {
    return [
      { title: 'Spinel', duration: '2021.03 ~ 2021.08', desc: '각 장비들의 데이터를 수집, 저장, 모니터링하는 프로덕트로, 웹 사이트 구축을 담당했습니다.\n프론트엔드 쪽의 프로젝트 세팅 및 공통 부분도 담당하였습니다.', techStackIcon: isHydrated
        ? [
            { iconUrl: `/images/about/tech-stack/${mode}/javascript.svg`, techName: 'Javascript' },
            { iconUrl: `/images/about/tech-stack/${mode}/vuedotjs.svg`, techName: 'Vue' },
            { iconUrl: `/images/about/tech-stack/${mode}/nuxt.svg`, techName: 'Nuxt' },
            { iconUrl: `/images/about/tech-stack/${mode}/webpack.svg`, techName: 'Webpack' },
            { iconUrl: `/images/about/tech-stack/${mode}/antdesign.svg`, techName: 'Ant Design Vue' },
            { iconUrl: `/images/about/tech-stack/${mode}/swagger.svg`, techName: 'Swagger CodeGen' },
            { iconUrl: `/images/about/tech-stack/${mode}/gitlab.svg`, techName: 'Gitlab CI' },
          ]
        : [] },
      { title: 'KDIS Push APP Admin', duration: '2021.01 ~ 2021.4', desc: 'KDIS push 알림 앱의 Admin 웹 사이트 구축하는 프로젝트입니다.\n프론트엔드 쪽 프로젝트 세팅 및 공통 부분과 일부 페이지 구축을 담당했습니다.', techStackIcon: isHydrated
        ? [
            { iconUrl: `/images/about/tech-stack/${mode}/javascript.svg`, techName: 'Javascript' },
            { iconUrl: `/images/about/tech-stack/${mode}/vuedotjs.svg`, techName: 'Vue' },
            { iconUrl: `/images/about/tech-stack/${mode}/webpack.svg`, techName: 'Webpack' },
            { iconUrl: `/images/about/tech-stack/${mode}/antdesign.svg`, techName: 'Ant Design Vue' },
            { iconUrl: `/images/about/tech-stack/${mode}/swagger.svg`, techName: 'Swagger CodeGen' },
            { iconUrl: `/images/about/tech-stack/${mode}/gitlab.svg`, techName: 'Gitlab CI' },
          ]
        : [] },
      { title: 'FMS', duration: '2020.08 ~ 2021.08', desc: '공장의 시설, 자재 등을 관리하는 웹 사이트 구축하는 프로젝트입니다.\n일부 페이지와 차트 부분을 담당하여 개발하였습니다.', techStackIcon: isHydrated
        ? [
            { iconUrl: `/images/about/tech-stack/${mode}/javascript.svg`, techName: 'Javascript' },
            { iconUrl: `/images/about/tech-stack/${mode}/vuedotjs.svg`, techName: 'Vue' },
            { iconUrl: `/images/about/tech-stack/${mode}/webpack.svg`, techName: 'Webpack' },
            { iconUrl: `/images/about/tech-stack/${mode}/antdesign.svg`, techName: 'Ant Design Vue' },
            { iconUrl: `/images/about/tech-stack/${mode}/swagger.svg`, techName: 'Swagger CodeGen' },
            { iconUrl: `/images/about/tech-stack/${mode}/gitlab.svg`, techName: 'Gitlab CI' },
          ]
        : [] },
    ];
  }

  return (
    <div>
      <Collapsible
        open={isOpen.twoz1st}
        onOpenChange={() => handleOpenChange('twoz1st')}
        className="space-y-2"
      >
        <div className="flex items-center justify-between collapsible">
          <div className="text-md font-semibold">
            2020.03 ~ 2021.08
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-9 p-0">
              {isOpen.twoz1st
                ? (<Icon icon="mingcute:up-line" className="w-4 h-4" />)
                : (<Icon icon="mingcute:down-line" className="w-4 h-4" />)}
              <span className="sr-only">Toggle</span>
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="space-y-2">
          <Card className="project-card">
            <CardTitle className="px-4 pt-4">
              트웬티온스 인턴
            </CardTitle>
            <CardDescription className="px-4 mt-1 project-card-desc">
              대학 생활과 병행하여 인턴 업무를 수행했습니다.
              {'\n'}
              처음에는 스타트업이었기 때문에 사내의 유일한 프론트엔드 개발자로 운좋게 프론트엔드 쪽의 공통을 다루며 시작할 수 있었습니다.
              {'\n'}
              아래는 인턴시절 맡았던 주요 프로젝트들입니다.
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
