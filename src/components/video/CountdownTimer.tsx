import { useState, useEffect, useRef } from 'react';

interface CountdownTimerProps {
  seconds: number;
  onComplete: () => void;
}

export function CountdownTimer({ seconds, onComplete }: CountdownTimerProps) {
  const [count, setCount] = useState(seconds);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (count <= 0) { onCompleteRef.current(); return; }
    const t = setTimeout(() => setCount(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-foreground/80 rounded-2xl z-10" role="timer" aria-live="assertive">
      <p className="text-primary-foreground text-lg font-semibold">Get Ready</p>
      <p className="text-7xl font-extrabold text-primary-foreground">{count}</p>
    </div>
  );
}
