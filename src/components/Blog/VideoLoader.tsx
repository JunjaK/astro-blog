// @flow
import * as React from 'react';

type Props = {
  src: string;
};
export default function VideoLoader({ src }: Props) {
  return (
    <div>
      <video src={src} controls />
    </div>
  );
}
