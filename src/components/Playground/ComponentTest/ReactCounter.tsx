import { Icon } from '@iconify/react';
import React, { useState } from 'react';

export default function ReactCounter() {
  const [count, setCount] = useState(0);
  const dobuleCount = function () {
    return count * 2;
  };

  function counterChange(arg: 'increment' | 'decrement') {
    if (arg === 'increment') {
      setCount(count + 1);
    }
    else {
      setCount(count - 1);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mx-auto w-1/2">
        <button
          type="button"
          className="text-2xl"
          onClick={() => counterChange('decrement')}
        >
          <Icon icon="tabler:minus" />
        </button>
        <p className="text-2xl font-bold">{count}</p>
        <button
          type="button"
          className="text-2xl"
          onClick={() => counterChange('increment')}
        >
          <Icon icon="tabler:plus" />
        </button>
      </div>
      <div>
        DoubleCount:
        {' '}
        {dobuleCount()}
      </div>
    </>
  );
}
