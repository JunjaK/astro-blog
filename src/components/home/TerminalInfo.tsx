'use client';

import {
  AnimatedSpan,
  Terminal,
  TypingAnimation,
} from '@/components/ui/terminal';

export default function TerminalInfo() {
  return (
    <Terminal className="">
      <TypingAnimation>&gt; pnpm dlx jun-dev-blog@latest init</TypingAnimation>

      <AnimatedSpan delay={1500} className="text-green-500">
        <span>✔ Preflight checks.</span>
      </AnimatedSpan>

      <AnimatedSpan delay={2000} className="text-green-500">
        <span>✔ Verifying framework, Astro & React.</span>
      </AnimatedSpan>

      <AnimatedSpan delay={2500} className="text-green-500">
        <span>✔ Validating Tailwind CSS.</span>
      </AnimatedSpan>

      <AnimatedSpan delay={3000} className="text-green-500">
        <span>✔ Validating Nyxb UI.</span>
      </AnimatedSpan>

      <AnimatedSpan delay={3500} className="text-green-500">
        <span>✔ Installing dependencies...</span>
      </AnimatedSpan>

      <AnimatedSpan delay={4500} className="text-green-500">
        <span>✔ Check updates...</span>
      </AnimatedSpan>

      <AnimatedSpan delay={5000} className="text-blue-500">
        <span>ℹ Current version is Latest!:</span>
      </AnimatedSpan>

      <TypingAnimation delay={5500} className="text-muted-foreground">
        Success! Dev-Blog loaded completed.
      </TypingAnimation>
    </Terminal>
  );
}
