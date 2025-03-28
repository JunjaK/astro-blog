import BoxReveal from '@/components/ui/box-reveal';
import { Button } from '@/components/ui/button';
import { FadeText } from '@/components/ui/fade-text';
import { Icon } from '@iconify/react';

export default function Intro() {
  return (
    <div className="mt-4">

      <BoxReveal boxColor="rgba(39,39,39,0.6)" duration={0.5}>
        <p>
          <span className="max-sm:text-sm">
            안녕하세요, 여기는 저의 개인 블로그입니다.
          </span>
          <br />
          <span className="max-sm:text-sm">
            이 블로그에서는 저의 간단한 정보들을 확인 할 수 있습니다.
          </span>
        </p>
      </BoxReveal>

      <BoxReveal boxColor="rgba(39,39,39,0.6)" duration={1}>
        <div>
          <div className="max-sm:text-sm flex gap-px2 mt-2">
            블로그 포스트는 주로 개발에 관한 것들,
          </div>
          <FadeText
            className="font-bold max-sm:text-sm text-black dark:text-white"
            direction="right"
            framerProps={{
              show: { transition: { delay: 0.4 } },
            }}
            text="(🌐 웹 개발, 💻 프론트엔드)"
          />
          <div className="mt-1 max-sm:text-sm">
            그리고 제가 관심있어 하는 주제를 올릴 예정입니다.
          </div>
          <FadeText
            className="font-bold max-sm:text-sm text-black dark:text-white"
            direction="right"
            framerProps={{
              show: { transition: { delay: 0.4 } },
            }}
            text="(🎮 게임, 🏖 여행, 🎧 음악, 🎞️ 애니메이션)"
          />
        </div>
      </BoxReveal>
      <BoxReveal boxColor="rgba(39,39,39,0.6)" duration={1.5}>
        <Button className="mt-6 max-sm:text-sm" asChild>
          <a href="/blog/">
            <Icon icon="mingcute:document-2-line" className="icon mr-1" />
            포스트 바로가기
          </a>
        </Button>
      </BoxReveal>
    </div>
  );
}
