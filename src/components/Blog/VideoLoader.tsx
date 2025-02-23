import { getBasePathWithUrl } from '@/utils/getBasePathWithUrl.ts';
// @flow
import * as React from 'react';

type Props = {
  src: string;
};
export default function VideoLoader({ src }: Props) {
  return (
    <div>
      <video src={getBasePathWithUrl(src)} controls />
    </div>
  );
}
