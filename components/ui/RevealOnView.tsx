"use client";

import { forwardRef, useEffect, useRef, useState, type HTMLAttributes } from "react";

export type RevealOnViewProps = HTMLAttributes<HTMLDivElement> & {
  /** Sets `--reveal-delay` for staggered animations (ms). */
  delayMs?: number;
};

/**
 * Scroll-reveal wrapper: keeps `is-visible` in React state so re-renders (scroll, toggles, etc.)
 * do not strip the class — unlike a global IntersectionObserver that mutates `classList` only.
 */
export const RevealOnView = forwardRef<HTMLDivElement, RevealOnViewProps>(function RevealOnView(
  { className, children, style, delayMs, ...rest },
  ref
) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    if (delayMs !== undefined) {
      el.style.setProperty("--reveal-delay", `${delayMs}ms`);
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setShown(true);
          obs.unobserve(entry.target);
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delayMs]);

  const mergedClass = [className, shown ? "is-visible" : ""].filter(Boolean).join(" ");

  return (
    <div
      ref={(node) => {
        innerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      data-reveal
      className={mergedClass}
      style={style}
      {...rest}
    >
      {children}
    </div>
  );
});
