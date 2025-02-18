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
export function UnivTimeline({ isOpen, handleOpenChange }: Props) {
  const theme = useStore($theme);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  function projectList(mode: string) {
    return [
      { title: '실시간 드론 관제 웹', duration: '2021.03 ~ 2021.06', desc: '대학교 캡스톤 프로젝트로, 당시 인턴 생활을 했던 트웬티온스와 같이 협업하여 진행하였습니다.\n웹 상에서 웹 소켓 통신을 통해 실시간으로 드론의 위치를 지도에 표시해주는 시스템으로, 프로젝트 구성 및 웹소켓 통신 등의 역할을 맡았습니다.', techStackIcon: isHydrated
        ? [
            { iconUrl: `/images/about/tech-stack/${mode}/javascript.svg`, techName: 'Javascript' },
            { iconUrl: `/images/about/tech-stack/${mode}/vuedotjs.svg`, techName: 'Vue' },
            { iconUrl: `/images/about/tech-stack/${mode}/nuxt.svg`, techName: 'Nuxt' },
            { iconUrl: `/images/about/tech-stack/${mode}/webpack.svg`, techName: 'Webpack' },
            { iconUrl: `/images/about/tech-stack/${mode}/antdesign.svg`, techName: 'Ant Design Vue' },
            { iconUrl: `/images/about/tech-stack/${mode}/socketdotio.svg`, techName: 'Socket IO' },
            { iconUrl: `/images/about/tech-stack/${mode}/swagger.svg`, techName: 'Swagger CodeGen' },
            { iconUrl: `/images/about/tech-stack/${mode}/gitlab.svg`, techName: 'Gitlab CI' },
          ]
        : [] },
      { title: '내용 기반 유튜브 영상 추천 시스템', duration: '2020.03 ~ 2020.7', desc: '대학교 캡스톤 프로젝트로, 비디오 벡터를 학습한 딥러닝 모델을 통해 유튜브 영상을 입력하면 관련 태그를 분석해 다른 유튜브 영상을 추천하는 시스템입니다.\n해당 프로젝트에서 프론트화면 구성, 웹 영역과 파이썬 영역 연결, 영상 피쳐맵 추출 등의 역할을 맡았습니다.', techStackIcon: isHydrated
        ? [
            { iconUrl: `/images/about/tech-stack/${mode}/javascript.svg`, techName: 'Javascript' },
            { iconUrl: `/images/about/tech-stack/${mode}/vuedotjs.svg`, techName: 'Vue' },
            { iconUrl: `/images/about/tech-stack/${mode}/webpack.svg`, techName: 'Webpack' },
            { iconUrl: `/images/about/tech-stack/${mode}/vuetify.svg`, techName: 'Vuetify' },
            { iconUrl: `/images/about/tech-stack/${mode}/python.svg`, techName: 'Python' },
            { iconUrl: `/images/about/tech-stack/${mode}/mediapipe.svg`, techName: 'MediaPipe' },
          ]
        : [] },
      { title: 'Nuwbies', duration: '2019.07 ~ 2020.03', desc: '나고야대학 유학 시절에 진행한 일본 대학 커뮤니티 사이트 제작 프로젝트이며, 웹 개발을 본격적으로 시작하게 된 계기가 되어준 프로젝트입니다.\n웹 쪽은 Vue 기반으로 제작하였고, 모바일은 Flutter로 개발하였습니다.\n웹, 모바일, 백엔드 부분을 담당하여 개발을 진행했습니다.', techStackIcon: isHydrated
        ? [
            { iconUrl: `/images/about/tech-stack/${mode}/javascript.svg`, techName: 'Javascript' },
            { iconUrl: `/images/about/tech-stack/${mode}/vuedotjs.svg`, techName: 'Vue' },
            { iconUrl: `/images/about/tech-stack/${mode}/webpack.svg`, techName: 'Webpack' },
            { iconUrl: `/images/about/tech-stack/${mode}/vuetify.svg`, techName: 'Vuetify' },
            { iconUrl: `/images/about/tech-stack/${mode}/flutter.svg`, techName: 'Flutter' },
            { iconUrl: `/images/about/tech-stack/${mode}/express.svg`, techName: 'Express' },
            { iconUrl: `/images/about/tech-stack/${mode}/mongodb.svg`, techName: 'MongoDB' },
            { iconUrl: `/images/about/tech-stack/${mode}/amazons3.svg`, techName: 'Amazon S3' },
            { iconUrl: `/images/about/tech-stack/${mode}/amazonec2.svg`, techName: 'Amazon EC2' },
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
            2015.03 ~ 2021.08
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
              경희대학교 컴퓨터공학 학사
            </CardTitle>
            <CardDescription className="px-4 mt-1 project-card-desc">
              대학 입학 후 전공 수업을 들으며 어떤 길을 걸어갈까 고민하던 중, 일본 교환학생 시절 때 선배의 권유로 일본 대학 커뮤니티 제작 프로젝트에 참여하면서 웹 개발에 본격적으로 입문하게 되었습니다.
              {'\n'}
              비록 프로젝트는 완수하지 못했지만, 웹 부분의 다양한 기술을 경험할 수 있었고 이를 바탕으로 인턴 수행 및 대학 졸업 후 웹 프론트엔드 개발자로 진로를 잡을 수 있었습니다.
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
