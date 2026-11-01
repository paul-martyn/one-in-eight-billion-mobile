// «Be Born!» на экранах Start, Hub и Ended: цена в энергии и защита от
// случайного отказа от сохранённой жизни (showGuard оригинала, 204167).
// Если сохранена начатая жизнь (snapshot.resume), сначала спрашиваем:
// «Keep living» продолжает её, «Be born anew» — startLife, и startNewLife
// оригинала переносит сохранённую жизнь в непрожитые (199757-199760).
// Команды вызываются только из обработчиков нажатий.
import { useCallback, useEffect, useId, useState } from 'react';
import { useAdapter, useSnapshot } from '../../adapters/useGame';
import type { ResumeVM } from '../../adapters/viewModels';
import type { Nav } from '../../flow/FlowHost';
import { t } from '../../i18n';
import { ChunkyButton, Popup } from '../../ui/components';
import { CostBadge } from '../../ui/meta/Meta';
import { useMetaRefresh } from '../../ui/meta/useMeta';
import { useContinueLife, useStartNewLife } from './shared';
import './newLife.css';

/**
 * Новая жизнь с ценой и подтверждением. onStarted вызывается после
 * применённой команды startLife (навигация/анимация ухода — у экрана).
 */
export function useBeBorn(nav: Nav, active: boolean, onStarted: () => void) {
  const adapter = useAdapter();
  const snap = useSnapshot();
  const meta = snap.meta;
  const { start, busy } = useStartNewLife();
  const onContinue = useContinueLife(nav);
  const [guardOpen, setGuardOpen] = useState(false);
  const closeGuard = useCallback(() => setGuardOpen(false), []);
  useMetaRefresh(meta?.nextRefillAt);

  const begin = useCallback(async () => {
    if (await start()) onStarted();
  }, [start, onStarted]);

  /** Нажатие «Be Born!». */
  const request = useCallback(() => {
    if (!active || busy) return;
    const s = adapter.getSnapshot();
    if (s.status !== 'ready' || !s.meta?.canStartLife) return;
    if (s.resume) { setGuardOpen(true); return; }
    void begin();
  }, [active, busy, adapter, begin]);

  const guard = {
    open: guardOpen && active,
    resume: snap.resume,
    cost: meta?.lifeCost ?? null,
    canStart: !!meta?.canStartLife && !busy,
    onKeep: () => { setGuardOpen(false); onContinue(); },
    onNew: () => { setGuardOpen(false); void begin(); },
    onClose: closeGuard,
  };

  return {
    busy,
    request,
    guard,
    meta,
    /** Хватает ли энергии (кнопка недоступна, если нет). */
    canStart: !!meta?.canStartLife,
    cost: meta?.lifeCost ?? null,
  };
}

/** Окно подтверждения: начатая жизнь остановится и уйдёт в непрожитые. */
export function NewLifeGuard({ open, resume, cost, canStart, onKeep, onNew, onClose }: {
  open: boolean; resume: ResumeVM; cost: number | null; canStart: boolean; onKeep: () => void; onNew: () => void; onClose: () => void;
}) {
  const textId = useId();
  // Escape закрывает окно (только представление).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <Popup open={open && !!resume} title={t('hub.guard.title')} medallion={<BookGlyph />} medallionBg="#e6dcff" onClose={onClose} closeLabel={t('hub.guard.close')}>
      {resume && (
        <div className="nlg">
          <p className="nlg__text" id={textId}>
            <WithName
              text={resume.phase === 'birth' ? t('hub.guard.newborn', { name: MARK, place: resume.place }) : t('hub.guard.life', { name: MARK, age: resume.age, place: resume.place })}
              name={resume.name}
            />
            <span className="nlg__kept">{t('hub.guard.kept')}</span>
          </p>
          <div className="nlg__actions">
            <ChunkyButton tone="green" className="nlg__keep" onClick={onKeep} aria-describedby={textId}>{t('hub.guard.keep')}</ChunkyButton>
            <button type="button" className="soft-btn nlg__new" onClick={onNew} disabled={!canStart}>
              <span>{t('hub.guard.new')}</span>
              {cost != null && <CostBadge cost={cost} />}
            </button>
          </div>
        </div>
      )}
    </Popup>
  );
}

const MARK = '\u0001';
/** Имя в переведённой строке выделено жирным; порядок слов задаёт перевод. */
function WithName({ text, name }: { text: string; name: string }) {
  const [before = '', ...rest] = text.split(MARK);
  return <>{before}<strong>{name}</strong>{rest.join(name)}{' '}</>;
}

/** Книга жизней (иконка вкладки Lives), крупно для медальона. */
const BookGlyph = () => (
  <svg width="56" height="56" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="4.5" y="3" width="15" height="18.5" rx="2.5" fill="#ffffff" stroke="#5a3418" strokeWidth="1.6" />
    <path d="M8 3.5v17.5" stroke="#5a3418" strokeWidth="1.4" />
    <path d="M14 9.4c.9-1.6 3.5-1.2 3.5.8 0 1.6-2 2.8-3.5 4-1.5-1.2-3.5-2.4-3.5-4 0-2 2.6-2.4 3.5-.8Z" fill="#ff6b6b" stroke="#5a3418" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
);
