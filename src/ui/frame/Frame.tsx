// Кадр макета. Экраны нового флоу нарисованы в кадре шириной 393 единицы:
// кадр целиком масштабируется под ширину телефона (k = ширина / 393), а его
// высота H = высота телефона / k (примерно 700–900). Положение элементов по
// высоте считают раскладки экранов (src/screens/layouts.ts) от H. Так размеры,
// отступы и анимации совпадают с макетом на любом телефоне.
import { createContext, useContext, useLayoutEffect, useState, type ComponentProps, type CSSProperties, type RefObject } from 'react';
import './frame.css';

export const FRAME_W = 393;
export const FRAME_H = 852;

export type FrameBox = {
  /** Масштаб кадра: CSS-пикселей на единицу макета. */
  k: number;
  /** Высота кадра в единицах макета. */
  H: number;
  /** Безопасные зоны сверху и снизу в единицах макета. */
  top: number;
  bottom: number;
};

const INITIAL: FrameBox = { k: 1, H: FRAME_H, top: 0, bottom: 0 };
const FrameContext = createContext<FrameBox>(INITIAL);
export const FrameProvider = FrameContext.Provider;
export const useFrame = () => useContext(FrameContext);

/** Размер кадра по элементу-хосту (clientWidth/Height не зависят от transform). */
export function useFrameBox(host: RefObject<HTMLElement | null>, probe: RefObject<HTMLElement | null>): FrameBox {
  const [box, setBox] = useState<FrameBox>(INITIAL);
  useLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      const k = w / FRAME_W;
      const p = probe.current;
      const next: FrameBox = {
        k,
        H: Math.round((h / k) * 2) / 2,
        top: p ? Math.round(p.offsetHeight / k) : 0,
        bottom: p ? Math.round(p.offsetWidth / k) : 0,
      };
      setBox(b => (b.k === next.k && b.H === next.H && b.top === next.top && b.bottom === next.bottom ? b : next));
    };
    measure();
    if (typeof ResizeObserver !== 'function') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [host, probe]);
  return box;
}

/** CSS-переменные кадра для хоста. */
export const frameVars = (box: FrameBox) => ({ '--k': String(box.k), '--fh': `${box.H}px` }) as CSSProperties;

/** Слой в единицах макета: 393 × H, масштабируется целиком. */
export function Frame({ className = '', children, ...rest }: ComponentProps<'div'>) {
  return <div className={`frame ${className}`} {...rest}>{children}</div>;
}
