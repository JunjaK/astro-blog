import { FlickeringGrid } from '@/components/ui/flickering-grid';
import { useEffect, useMemo, useState } from 'react';

function useWindowWidth() {
  const [width, setWidth] = useState(() => (typeof window === 'undefined' ? 1200 : window.innerWidth));
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}

export default function Flickering() {
  const width = useWindowWidth();

  const calcWidth = useMemo(() => {
    if (width < 768) {
      return width * 0.95;
    }
    else if (width >= 768 && width < 1200) {
      return width * 0.8;
    }
    else {
      return 1200;
    }
  }, [width]);

  return (
    <div className="h-[25rem] mt-[6rem]">
      <FlickeringGrid
        className="[mask-image:radial-gradient(450px_circle_at_center,white,transparent)]"
        squareSize={4}
        gridGap={6}
        color="#60A5FA"
        maxOpacity={0.5}
        flickerChance={0.1}
        height={400}
        width={calcWidth}
      />
    </div>
  );
}
