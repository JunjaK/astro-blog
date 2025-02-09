import { ny } from '@/lib/utils';
import { motion, type MotionProps } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

interface AnimatedSpanProps extends MotionProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export function AnimatedSpan({
  children,
  delay = 0,
  className,
  ...props
}: AnimatedSpanProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: delay / 1000 }}
      className={ny('grid text-sm font-normal tracking-tight', className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface TypingAnimationProps extends MotionProps {
  children?: string;
  className?: string;
  duration?: number;
  delay?: number;
  text?: string;
  as?: React.ElementType;
}

export function TypingAnimation({
  children,
  text,
  className,
  duration = 60,
  delay = 0,
  as: Component = 'span',
  ...props
}: TypingAnimationProps) {
  const content = text || children;

  const MotionComponent = motion.create(Component, {
    forwardMotionProps: true,
  });

  const [displayedText, setDisplayedText] = useState<string>('');
  const [started, setStarted] = useState(false);
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const startTimeout = setTimeout(() => {
      setStarted(true);
    }, delay);
    return () => clearTimeout(startTimeout);
  }, [delay]);

  useEffect(() => {
    if (!started)
      return;

    let i = 0;
    const typingEffect = setInterval(() => {
      if (i < content.length) {
        setDisplayedText(content.substring(0, i + 1));
        i++;
      }
      else {
        clearInterval(typingEffect);
      }
    }, duration);

    return () => {
      clearInterval(typingEffect);
    };
  }, [content, duration, started]);

  return (
    <MotionComponent
      ref={elementRef}
      className={ny('text-sm font-normal tracking-tight', className)}
      {...props}
    >
      {displayedText}
    </MotionComponent>
  );
}

interface TerminalProps {
  children: React.ReactNode;
  className?: string;
}

export function Terminal({ children, className }: TerminalProps) {
  return (
    <div
      className={ny(
        'z-0 h-full max-h-[400px] w-full max-w-lg rounded-xl border border-border bg-background',
        className,
      )}
    >
      <div className="flex flex-col gap-y-2 border-b border-border p-4">
        <div className="flex flex-row gap-x-2">
          <div className="h-2 w-2 rounded-full bg-red-500"></div>
          <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
          <div className="h-2 w-2 rounded-full bg-green-500"></div>
        </div>
      </div>
      <pre className="p-4">
        <code className="grid gap-y-1 overflow-auto">{children}</code>
      </pre>
    </div>
  );
}
