import type { ICloud, SimpleIcon } from 'react-icon-cloud';
import { $theme } from '@/store/system.ts';
import { useStore } from '@nanostores/react';
import { useEffect, useMemo, useState } from 'react';
import { Cloud, fetchSimpleIcons, renderSimpleIcon } from 'react-icon-cloud';

export const cloudProps: Omit<ICloud, 'children'> = {
  containerProps: {
    style: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      paddingTop: 40,
    },
  },
  options: {
    reverse: true,
    depth: 1,
    wheelZoom: false,
    imageScale: 2,
    activeCursor: 'default',
    tooltip: 'native',
    initial: [0.1, -0.1],
    clickToFront: 500,
    tooltipDelay: 0,
    outlineColour: '#0000',
    maxSpeed: 0.04,
    minSpeed: 0.02,
    // dragControl: false,
  },
};

export function renderCustomIcon(icon: SimpleIcon, theme: string) {
  const bgHex = theme === 'light' ? '#f3f2ef' : '#080510';
  const fallbackHex = theme === 'light' ? '#6e6e73' : '#ffffff';
  const minContrastRatio = theme === 'dark' ? 2 : 1.2;

  return renderSimpleIcon({
    icon,
    bgHex,
    fallbackHex,
    minContrastRatio,
    size: 42,
    aProps: {
      href: undefined,
      target: undefined,
      rel: undefined,
      onClick: (e: any) => e.preventDefault(),
    },
  });
}

export interface DynamicCloudProps {
  iconSlugs: string[];
}

type IconData = Awaited<ReturnType<typeof fetchSimpleIcons>>;

export default function IconCloud({ iconSlugs }: DynamicCloudProps) {
  const [data, setData] = useState<IconData | null>(null);
  const theme = useStore($theme);
  console.log(theme);

  useEffect(() => {
    fetchSimpleIcons({ slugs: iconSlugs }).then((e) => {
      console.log(iconSlugs, e);
      setData(e);
    });
  }, [iconSlugs]);

  const renderedIcons = useMemo(() => {
    if (!data)
      return null;

    return Object.values(data.simpleIcons).map((icon) =>
      renderCustomIcon(icon, theme || 'light'),
    );
  }, [data, theme]);

  return (
  // @ts-expect-error is fine
    <Cloud {...cloudProps}>
      <>{renderedIcons}</>
    </Cloud>
  );
}
