import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

interface TransitionFrame {
  key: string;
  content: ReactNode;
}

const TRANSITION_DURATION_MS = 480;

export function PageTransition({ children, transitionKey, direction }: { children: ReactNode; transitionKey: string; direction: 'forward' | 'back' }) {
  const [current, setCurrent] = useState<TransitionFrame>({ key: transitionKey, content: children });
  const [incoming, setIncoming] = useState<TransitionFrame | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestChildren = useRef(children);
  latestChildren.current = children;

  useLayoutEffect(() => {
    if (transitionKey === current.key) return;
    const next = { key: transitionKey, content: latestChildren.current };
    setIncoming(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setCurrent(next);
      setIncoming(null);
      timer.current = null;
    }, TRANSITION_DURATION_MS);
  }, [current.key, transitionKey]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  if (!incoming) return <div className="page-transition"><div className="page-transition__view" key={current.key}>{current.content}</div></div>;

  return (
    <div className={`page-transition is-changing is-${direction}`}>
      <div className="page-transition__view page-transition__view--outgoing" key={current.key} aria-hidden="true">{current.content}</div>
      <div className="page-transition__view page-transition__view--incoming" key={incoming.key}>{incoming.content}</div>
    </div>
  );
}
