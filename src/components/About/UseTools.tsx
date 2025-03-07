import { motion } from 'framer-motion';
// @flow
import * as React from 'react';

type ToolCategory = {
  title: string;
  items: string[];
};

export function UseTools() {
  const tools: ToolCategory[] = [
    {
      title: 'OS',
      items: ['Mac: Mostly Web Dev ', 'Window: Game', 'Linux(Ubuntu): Server'],
    },
    {
      title: 'Browser',
      items: ['Chrome', 'Safari'],
    },
    {
      title: 'IDE',
      items: ['Cursor: in Testing', 'Webstorm: Main', 'VSCode: Sub'],
    },
    {
      title: 'AI',
      items: ['Perflexity', 'ChatGpt', 'Copilot'],
    },
    {
      title: 'Text Editor',
      items: ['Notion', 'Typora'],
    },
    {
      title: 'Terminal',
      items: ['Iterm2: Main', 'Terminus: SSH, SFTP Client'],
    },
    {
      title: '기타 맥 프로그램',
      items: [
        'Homebrew: App Package Manager',
        'Better Touch Tool: Mac Trackpad Gesture & Shortcut Customization',
        'Raycast: Spotlight Alternative Multi-functional Utility Tool',
        'Bartender: Top Menu Bar Manager',
        'CleanShot X: ScreenShot & Screen Record Tool',
        'PixelSnap: Screen px Measuring Tool',
        'ColorSlurp: ColorPicker',
        'AltTab: Tab Handling Tool',
        'Pastpal: Clipboard Manager',
      ],
    },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <div className="space-y-6">
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-4"
      >
        Use Tools
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-muted-foreground"
      >
        현재 제가 웹 개발 등 작업을 할 때 주로 사용하는 프로그램들입니다.
      </motion.p>
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {tools.map((category) => (
          <motion.div
            key={category.title}
            variants={item}
            className="space-y-2 p-4 bg-white dark:bg-neutral-800 shadow-md rounded-lg"
          >
            <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
              {category.title}
            </h3>
            <ul className="list-disc list-inside space-y-1 text-neutral-600 dark:text-neutral-400">
              {category.items.map((item) => (
                <li key={item} className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
