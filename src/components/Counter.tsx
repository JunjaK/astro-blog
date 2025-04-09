import { useState } from 'react';
import './Counter.css';

interface CounterProps {
  children: JSX.Element;
  count: number;
}

export default function Counter({ children, count: initialCount }: CounterProps) {
  const [count, setCount] = useState(initialCount);
  const add = () => setCount((i) => i + 1);
  const subtract = () => setCount((i) => i - 1);

  return (
    <>
      <div className="counter">
        <button type="button" onClick={subtract}>-</button>
        <pre>{count}</pre>
        <button type="button" onClick={add}>+</button>
      </div>
      <div className="counter-message">{children}</div>
    </>
  );
}
