import { Icon } from '@/components/ui/icon';
import * as React from 'react';

export default function SearchLoading() {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="text-4xl text-white">
        <Icon icon="svg-spinners:bars-rotate-fade" />
      </div>
    </div>
  );
}
