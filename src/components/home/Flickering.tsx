import { FlickeringGrid } from '@/components/ui/flickering-grid';
import { useMemo } from 'react';
import { useWindowSize } from 'react-use';

export default function Flickering() {
  const { width } = useWindowSize();

  const calcWidth = useMemo(() => {
    return width < 768 ? width * 0.95 : width * 0.8;
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
