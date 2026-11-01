// Оболочка окон экрана жизни (решение, пауза) в стиле макета: затемнение,
// оранжевая карточка, медальон, бирюзовая лента. В отличие от общего Popup
// карточка подстраивается под высоту экрана (320–430 × 568–932) и
// прокручивает своё содержимое, если вариантов много.
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import spec from '../../../design/motion.json';
import { Ribbon } from '../../../ui/components';
import { useReducedMotion } from '../../../ui/motionPrefs';

const POP = spec.sequences.popup;
const POP_EASE = spec.easing.pop as [number, number, number, number];

export function LifeDialog({ open, title, titleId, medallion, onEscape, below, contentKey, variant, children }: {
  open: boolean;
  title: string;
  titleId: string;
  medallion: ReactNode;
  onEscape?: () => void;
  /** Элемент под карточкой (красный крестик окна паузы). */
  below?: ReactNode;
  /** Смена содержимого (вопрос → ответ → следующий вопрос): короткое проявление и фокус на окне. */
  contentKey: string;
  variant: 'decision' | 'pause';
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="layer"
          className={`ld-layer ld-layer--${variant}`}
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: reduced ? 0 : POP.exit.durationMs / 1000 } }}
          transition={{ duration: POP.backdrop.durationMs / 1000 }}
        >
          <DialogCard title={title} titleId={titleId} medallion={medallion} onEscape={onEscape} below={below} contentKey={contentKey} reduced={reduced}>
            {children}
          </DialogCard>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DialogCard({ title, titleId, medallion, onEscape, below, contentKey, reduced, children }: {
  title: string; titleId: string; medallion: ReactNode; onEscape?: () => void; below?: ReactNode; contentKey: string; reduced: boolean; children: ReactNode;
}) {
  const ref = useRef<HTMLElement | null>(null);
  // Фокус на окне при открытии и смене содержимого; при закрытии — обратно.
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    return () => { if (prev && prev.isConnected) prev.focus({ preventScroll: true }); };
  }, []);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, [contentKey]);
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && onEscape) { e.stopPropagation(); onEscape(); }
  };
  return (
    <div className="ld-wrap">
      <motion.section
        ref={ref}
        className="ld"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        initial={reduced ? false : { opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: POP.enter.durationMs / 1000, ease: POP_EASE }}
      >
        <div className="ld__medallion" aria-hidden="true">{medallion}</div>
        <div className="ld__ribbon"><Ribbon as="h2"><span id={titleId}>{title}</span></Ribbon></div>
        <motion.div
          key={contentKey}
          className="ld__content"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.16 }}
        >
          {children}
        </motion.div>
        {below}
      </motion.section>
    </div>
  );
}
