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
export function Twoz2ndTimeline({ isOpen, handleOpenChange }: Props) {
  const theme = useStore($theme);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  function projectList(mode: string) {
    return [
      { title: '3D Editor', duration: '2023.06 ~ 2024.08', desc: 'Unity WebGL을 활용한 3D Editor.\nUnity WebGL에서 제공하는 API(다른 분이 개발)을 활용하여 3D 오브젝트들을 배치 및 컨트롤하는 에디터를 개발하는 프로젝트입니다.\nWeb 쪽은 설계/디자인 포함 단독으로 개발을 진행했습니다.', techStackIcon: isHydrated
        ? [
            { iconUrl: `/images/about/tech-stack/${mode}/typescript.svg`, techName: 'Typescript' },
            { iconUrl: `/images/about/tech-stack/${mode}/vuedotjs.svg`, techName: 'Vue' },
            { iconUrl: `/images/about/tech-stack/${mode}/vite.svg`, techName: 'Vite' },
            { iconUrl: `/images/about/tech-stack/${mode}/unity.svg`, techName: 'Unity WebGL' },
            { iconUrl: `/images/about/tech-stack/${mode}/antdesign.svg`, techName: 'Ant Design Vue' },
            { iconUrl: `/images/about/tech-stack/${mode}/gitlab.svg`, techName: 'Gitlab CI' },
          ]
        : [] },
      { title: '3D Viewer', duration: '2023.01 ~ 2024.08', desc: 'Unity WebGL을 활용한 3D Viewer.\n초기에는 3D Editor 없이 수동으로 좌표를 통해 배치하여 웹 사이트에 올렸으나, 3D Editor 개발 후 이를 활용하고 여러 기능들을 추가한 프로젝트.\n이 프로젝트 기반으로 각세종 SI의 3D Viewer 등 다른 여러 프로젝트에 도입되었습니다.', techStackIcon: isHydrated
        ? [
            { iconUrl: `/images/about/tech-stack/${mode}/typescript.svg`, techName: 'Typescript' },
            { iconUrl: `/images/about/tech-stack/${mode}/vuedotjs.svg`, techName: 'Vue' },
            { iconUrl: `/images/about/tech-stack/${mode}/vite.svg`, techName: 'Vite' },
            { iconUrl: `/images/about/tech-stack/${mode}/unity.svg`, techName: 'Unity WebGL' },
            { iconUrl: `/images/about/tech-stack/${mode}/antdesign.svg`, techName: 'Ant Design Vue' },
            { iconUrl: `/images/about/tech-stack/${mode}/gitlab.svg`, techName: 'Gitlab CI' },
          ]
        : [] },
      { title: 'ACUPS SI', duration: '2023.01 ~ 2023.10', desc: 'ACUPS의 상태, 정보들을 모니터링하는 웹 사이트를 구축하는 프로젝트입니다.\nDraw.io를 통하여 계통도를 그리고 웹에서 상태에 따라 색상, 값들을 변경하는 작업을 거쳤습니다.\n프론트엔드 쪽 단독으로 개발을 맡았습니다.', techStackIcon: isHydrated
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
      { title: 'Viven', duration: '2022.01 ~ 2024.08', desc: '사내의 메타버스 프로덕트인 Viven의 웹 사이트 구축하는 프로젝트입니다.\n특이사항으로는 Viven Unity내에서 UI 중 일부를 웹뷰로 표현하기 때문에 Unity와 WebView 간의 통신이 있습니다.\n프론트엔드 쪽 리드 개발자를 담당하였고, 백엔드도 일부 다루었습니다.', techStackIcon: isHydrated
        ? [
            { iconUrl: `/images/about/tech-stack/${mode}/javascript.svg`, techName: 'Javascript' },
            { iconUrl: `/images/about/tech-stack/${mode}/typescript.svg`, techName: 'Typescript' },
            { iconUrl: `/images/about/tech-stack/${mode}/vuedotjs.svg`, techName: 'Vue' },
            { iconUrl: `/images/about/tech-stack/${mode}/vite.svg`, techName: 'Vite' },
            { iconUrl: `/images/about/tech-stack/${mode}/antdesign.svg`, techName: 'Ant Design Vue' },
            { iconUrl: `/images/about/tech-stack/${mode}/spring.svg`, techName: 'Spring' },
            { iconUrl: `/images/about/tech-stack/${mode}/postgresql.svg`, techName: 'PostgreSQL' },
            { iconUrl: `/images/about/tech-stack/${mode}/swagger.svg`, techName: 'Swagger CodeGen' },
            { iconUrl: `/images/about/tech-stack/${mode}/gitlab.svg`, techName: 'Gitlab CI' },
          ]
        : [] },
      { title: 'EMS SI', duration: '2021.11 ~ 2023.04', desc: '테양광 에너지 상태, 정보들을 모니터링하는 웹 사이트를 구축하는 프로젝트입니다.\nDraw.io를 통하여 계통도를 그리고 웹에서 상태에 따라 색상, 값들을 변경하는 작업을 거쳤고, NodeRed를 통하여 공공 API 조회 및 데이터 수집 등을 진행해였습니다.\n해당 프로젝트에서 프론트엔드 쪽 리드 개발자를 담당하였습니다.', techStackIcon: isHydrated
        ? [
            { iconUrl: `/images/about/tech-stack/${mode}/javascript.svg`, techName: 'Javascript' },
            { iconUrl: `/images/about/tech-stack/${mode}/vuedotjs.svg`, techName: 'Vue' },
            { iconUrl: `/images/about/tech-stack/${mode}/nuxt.svg`, techName: 'Nuxt' },
            { iconUrl: `/images/about/tech-stack/${mode}/webpack.svg`, techName: 'Webpack' },
            { iconUrl: `/images/about/tech-stack/${mode}/antdesign.svg`, techName: 'Ant Design Vue' },
            { iconUrl: `/images/about/tech-stack/${mode}/swagger.svg`, techName: 'Swagger CodeGen' },
            { iconUrl: `/images/about/tech-stack/${mode}/nodered.svg`, techName: 'Node-RED' },
            { iconUrl: `/images/about/tech-stack/${mode}/gitlab.svg`, techName: 'Gitlab CI' },
          ]
        : [] },

      { title: 'Spinel', duration: '2021.09 ~ 2024.08', desc: '인턴 시절에 진행한 프로젝트를 이어 진행하였습니다.\n새로운 기능 개발, 성능 이슈 해결, 솔루션화 등을 진행했습니다.\n해당 프로젝트에서 프론트엔드 쪽 리드 개발자를 담당하였습니다.', techStackIcon: isHydrated
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
    ];
  }

  return (
    <div>
      <Collapsible
        open={isOpen.twoz2nd}
        onOpenChange={() => handleOpenChange('twoz2nd')}
        className="space-y-2"
      >
        <div className="flex items-center justify-between collapsible">
          <div className="text-md font-semibold">
            2021.09 ~ 2024.01
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-9 p-0">
              {isOpen.twoz2nd
                ? (<Icon icon="mingcute:up-line" className="w-4 h-4" />)
                : (<Icon icon="mingcute:down-line" className="w-4 h-4" />)}
              <span className="sr-only">Toggle</span>
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="space-y-2">
          <Card className="project-card">
            <CardTitle className="px-4 pt-4">
              트웬티온스 전임
            </CardTitle>
            <CardDescription className="px-4 mt-1 project-card-desc">
              대학교 졸업 후, 인턴에서 정식으로 입사하여 전임이 되었습니다.
              {'\n'}
              회사는 조금 커졌지만, 프론트엔드 개발자는 인턴 / 신입 위주였어서 제가 그에 대한 관리 및 지도를 담당하였고, 개발 외에도 프로젝트 관리 등의 역할을 맡게 되었습니다.
              {'\n'}
              인턴 시절에 이어서 프론트엔드 쪽의 공통 구조를 관리하는 역할을 이어 갔습니다.
              {'\n'}
              아래는 전임시절 맡았던 주요 프로젝트들입니다.
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
