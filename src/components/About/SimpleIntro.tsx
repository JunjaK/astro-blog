import profileImg from '@/assets/images/profile.png';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button.tsx';
import { ny } from '@/lib/utils.ts';
import { Icon } from '@iconify/react';
// @flow
import * as React from 'react';

export function SimpleIntro() {
  return (
    <div className="simple-intro-wrapper">
      <figure
        className={`${ny(
          'relative mx-auto h-[23.5rem] max-md:w-full w-[20rem] overflow-hidden rounded-2xl py-4',
          // animation styles

          'transition-all duration-200 ease-in-out hover:scale-[103%]',
          // light styles

          'bg-white [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]',
          // dark styles

          'transform-gpu dark:bg-transparent dark:backdrop-blur-md dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]',
        )} profile-wrapper`}
      >
        <div className="flex justify-center">
          <Avatar className="size-52 pt-4  bg-zinc-200 dark:bg-zinc-800">
            <AvatarImage src={profileImg.src} alt="ProfileIMG" />
            <AvatarFallback>MY</AvatarFallback>
          </Avatar>
        </div>

        <div className="name text-zinc-800 dark:text-zinc-100">
          Yoon JunHyeon
        </div>
        <div className="desc text-zinc-500 dark:text-zinc-400">
          Frontend Developer
        </div>
        <div className="desc text-zinc-500 dark:text-zinc-400">
          Currently - Free
        </div>
        <div className="flex items-center justify-center">
          <Button variant="ghost" size="icon" asChild>
            <a href="https://github.com/JunjaK">
              <Icon icon="mingcute:github-fill" className="icon text-lg ml-1 text-gray-700 dark:text-gray-300" />
            </a>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <a href="https://www.linkedin.com/in/junjak-063081213">
              <Icon icon="mingcute:linkedin-fill" className="icon text-lg ml-1 text-gray-700 dark:text-gray-300" />
            </a>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <a href="mailto:haring157@gmail.com">
              <Icon icon="mingcute:mail-fill" className="icon text-lg ml-1 text-gray-700 dark:text-gray-300" />
            </a>
          </Button>
        </div>
      </figure>

      <div className="desc-wrapper">
        <h3 className="text-zinc-800 dark:text-zinc-100 mt-2">
          Hi 👋, I'm JunHyeon
        </h3>
        <p className="desc text-zinc-700 dark:text-zinc-300 mt-3">
          저는 게임과 서브컬쳐, 그리고 일본 여행을 좋아하는 💻 웹 프론트 개발자입니다.
        </p>
        <p className="desc text-zinc-700 dark:text-zinc-300 mt-2">
          다른 개발 영역과는 다르게 내가 요청한 것이 즉각적으로 🔍UI/UX의 형태로
        </p>
        <p className="desc text-zinc-700 dark:text-zinc-300">
          반응하는 것에 재미를 느껴 웹 프론트 엔드의 길을 걷기로 하였고,
        </p>
        <p className="desc text-zinc-700 dark:text-zinc-300">
          쉴새 없이 변화하는 개발 환경 그리고 새로운 기술들에 매력을 느껴
        </p>
        <p className="desc text-zinc-700 dark:text-zinc-300">
          웹 프론트 개발자의 길을 이어가고 있습니다.
        </p>
        <p className="desc text-zinc-700 dark:text-zinc-300 mt-2">
          다양하고 새로운 기술을 사용하여 ⌨ 생산성을 올리는 것에 큰 관심을 가지고 있고,
        </p>
        <p className="desc text-zinc-700 dark:text-zinc-300">
          여러 아티클, 유튜브 등을 보며 최신 기술 동향을 파악하려고 노력하고 있습니다.
        </p>
        <p className="desc text-zinc-700 dark:text-zinc-300 mt-2">
          최근에는 웹에서 구현하는 동적인 요소에 관심을 가져 🌏3D, 📊 차트 구현 등을 배우고 있습니다.
        </p>
        <p className="desc text-zinc-700 dark:text-zinc-300 mt-2">
          이 블로그는 예전부터 기술 블로그를 만들어 보고 싶었던 소망을 이루기 위해,
        </p>
        <p className="desc text-zinc-700 dark:text-zinc-300">
          그리고 새로운 기술을 써서 개인 프로젝트를 진행해보자! 라는 모토로 만들어졌습니다.
        </p>
      </div>
    </div>
  );
}
