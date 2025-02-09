import BoxReveal from '@/components/ui/box-reveal';
import { Button } from '@/components/ui/button';
import { FadeText } from '@/components/ui/fade-text';
import { Icon } from '@iconify/react';

export default function Intro() {
  return (
    <div className="mt-4">
      <BoxReveal boxColor="#27272A" duration={0.5}>
        <p>
          <span>
            안녕하세요, 여기는 저의 개인 블로그입니다.
          </span>
          <br />
          <span>
            여기서는 저의 간단한 정보들을 확인 할 수 있습니다.
          </span>
        </p>
      </BoxReveal>

      <BoxReveal boxColor="#27272A" duration={1}>
        <div>
          <div className="flex gap-px2 mt-2">
            <span>
              포스트는 주로 개발에 관한 것들
            </span>
            <FadeText
              className="font-bold text-black dark:text-white"
              direction="right"
              framerProps={{
                show: { transition: { delay: 0.4 } },
              }}
              text="(웹 개발, 프론트엔드 관련)"
            />
          </div>
          <div>
            그리고 제가 관심있어 하는 주제를 올릴 예정입니다.
          </div>
          <FadeText
            className="font-bold text-black dark:text-white"
            direction="right"
            framerProps={{
              show: { transition: { delay: 0.4 } },
            }}
            text="(🎮 게임, 🏖 여행, 🎧 음악, 🎞️ 애니메이션)"
          />
        </div>
      </BoxReveal>
      <BoxReveal boxColor="#27272A" duration={1.5}>
        <Button className="mt-6" asChild>
          <a href="/blog">
            <Icon icon="mingcute:document-2-line" className="icon mr-1" />
            포스트 바로가기
          </a>
        </Button>
      </BoxReveal>
    </div>
  );
}
