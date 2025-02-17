import { RippleButton } from '@/components/ui/ripple-button';
import { Icon } from '@iconify/react';
// @flow
import * as React from 'react';
import { useMemo } from 'react';
import { useWindowScroll } from 'react-use';

export default function FloatButton() {
  const { y } = useWindowScroll();
  const isScrollTop = useMemo(() => {
    return y === 0;
  }, [y]);

  function onClick() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  return (
    <div>
      <div className={`float-btn-wrapper ${isScrollTop ? 'hidden' : ''}`}>
        <RippleButton
          className="rounded-full"
          rippleColor="#ADD8E6"
          onClick={onClick}
        >
          <Icon icon="mingcute:large-arrow-up-fill" className="icon">
          </Icon>
        </RippleButton>
      </div>
    </div>

  );
}
