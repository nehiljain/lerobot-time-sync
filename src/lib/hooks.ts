import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/** Width of an element, tracked with ResizeObserver. Figures draw in real pixels. */
export function useElementWidth<T extends HTMLElement>(fallback = 960) {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

export function useInView<T extends Element>(rootMargin = '0px 0px -15% 0px', once = true) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin, once]);
  return [ref, inView] as const;
}

/**
 * Elapsed seconds while `running`. Calls back every animation frame.
 * Pauses when the tab is hidden (rAF stops) without jumping ahead on return.
 */
export function useRafLoop(running: boolean, onFrame: (dt: number) => void) {
  const cb = useRef(onFrame);
  cb.current = onFrame;
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      cb.current(dt);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [running]);
}

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

/** Eases a number toward `target` over `ms`. Jumps when reduced motion is on. */
export function useTween(target: number, ms = 600, reduced = false) {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  const start = useRef(0);
  const live = useRef(target);
  live.current = value;
  useEffect(() => {
    if (reduced) {
      setValue(target);
      return;
    }
    from.current = live.current;
    start.current = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start.current) / ms);
      const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      setValue(from.current + (target - from.current) * e);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, reduced]);
  return value;
}
