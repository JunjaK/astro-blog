import type { TechIconType } from '@/types/commonType.ts';
import { TechIcon } from '@/components/About/TechStackComp/TechIcon.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { $theme } from '@/store/system.ts';

import { useStore } from '@nanostores/react';
import { motion } from 'framer-motion';
// @flow
import * as React from 'react';
import { useEffect, useState } from 'react';

export function TechStack() {
  const theme = useStore($theme);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  function usingTechList(mode: string): TechIconType[] {
    if (!isHydrated)
      return [];
    return [
      { iconUrl: `/images/icon/tech-stack/${mode}/javascript.svg`, techName: 'Javascript' },
      { iconUrl: `/images/icon/tech-stack/${mode}/typescript.svg`, techName: 'Typescript' },
      { iconUrl: `/images/icon/tech-stack/${mode}/vuedotjs.svg`, techName: 'Vue' },
      { iconUrl: `/images/icon/tech-stack/${mode}/nuxt.svg`, techName: 'Nuxt' },
      { iconUrl: `/images/icon/tech-stack/${mode}/react.svg`, techName: 'React' },
      { iconUrl: `/images/icon/tech-stack/${mode}/tailwindcss.svg`, techName: 'Tailwind CSS' },
      { iconUrl: `/images/icon/tech-stack/${mode}/chartdotjs.svg`, techName: 'Chart.js' },
      { iconUrl: `/images/icon/tech-stack/${mode}/vite.svg`, techName: 'Vite' },
      { iconUrl: `/images/icon/tech-stack/${mode}/pnpm.svg`, techName: 'pnpm' },
      { iconUrl: `/images/icon/tech-stack/${mode}/nodedotjs.svg`, techName: 'Node.js' },
    ];
  }

  function learningTechList(mode: string) {
    if (!isHydrated)
      return [];

    return [
      { iconUrl: `/images/icon/tech-stack/${mode}/react.svg`, techName: 'React' },
      { iconUrl: `/images/icon/tech-stack/${mode}/nextdotjs.svg`, techName: 'Next' },
      { iconUrl: `/images/icon/tech-stack/${mode}/astro.svg`, techName: 'Astro' },
      { iconUrl: `/images/icon/tech-stack/${mode}/framer.svg`, techName: 'Framer' },
      { iconUrl: `/images/icon/tech-stack/${mode}/d3.svg`, techName: 'D3' },
      { iconUrl: `/images/icon/tech-stack/${mode}/threedotjs.svg`, techName: 'Three.js' },
      { iconUrl: `/images/icon/tech-stack/${mode}/graphql.svg`, techName: 'GraphQL' },
      { iconUrl: `/images/icon/tech-stack/${mode}/bun.svg`, techName: 'Bun' },
      { iconUrl: `/images/icon/tech-stack/${mode}/docker.svg`, techName: 'Docker' },
    ];
  }

  return (
    <div>
      <motion.h2 className="mb-4">
        Tech Stack
      </motion.h2>
      <Tabs defaultValue="use" className="tech-stack-tabs">
        <TabsList className="grid w-full grid-cols-2 h-[3rem]">
          <TabsTrigger value="use">
            <motion.div
              className="text-lg font-normal"
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              Using
            </motion.div>

          </TabsTrigger>
          <TabsTrigger value="learn">
            <motion.div
              className="text-lg font-normal"
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              Learning
            </motion.div>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="use">
          <motion.div>
            <Card className="tech-stack-card">
              <CardHeader>
                <CardTitle>Using</CardTitle>
                <CardDescription>
                  Currently, using these technologies.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-4">
                  {usingTechList(theme).map((item) => (
                    <TechIcon key={`using-${item.techName}`} iconUrl={item.iconUrl} techName={item.techName} />
                  )) }
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
        <TabsContent value="learn">
          <motion.div>
            <Card className="tech-stack-card">
              <CardHeader>
                <CardTitle>Learning</CardTitle>
                <CardDescription>
                  Currently, learning these technologies.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-4">
                  {learningTechList(theme).map((item) => (
                    <TechIcon key={`using-${item.techName}`} iconUrl={item.iconUrl} techName={item.techName} />
                  )) }
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>

    </div>

  );
}
