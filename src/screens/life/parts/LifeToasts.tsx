// Короткие сообщения адаптера (snapshot.notices): остановка «до следующего
// решения», потеря работы, ошибка события. Тексты — строки оригинала
// (frame0 207845-207907); сообщение уходит само через 5 с, как toast(…, 5e3).
// 'spend' (итог покупки листа «Spend & invest») показывает окно результата
// вкладки, а 'noEnergy' — строка ожидания на экранах старта; здесь они не
// всплывают и тихо снимаются тем же сроком.
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { t } from '../../../i18n';
import { useAdapter, useCoreView } from '../../../adapters/useGame';
import type { Notice } from '../../../adapters/gameAdapter';
import { lifeNoticeTexts, type LifeNoticeTexts } from '../../../adapters/vm/life';
import { useReducedMotion } from '../../../ui/motionPrefs';

const SHOW_MS = 5000;

/** Сообщения, которые экран жизни показывает сам (остальные видны в другом месте). */
const shown = (n: Notice) => n.kind !== 'spend' && n.kind !== 'noEnergy';

export function LifeToasts({ notices, ended = false }: { notices: Notice[]; ended?: boolean }) {
  // После смерти экран занимает окно «Life ended»: сообщения не всплывают поверх него.
  const visible = ended ? [] : notices.filter(shown);
  const quiet = ended ? notices : notices.filter(n => !shown(n));
  return (
    <div className="lf-toasts" role="region" aria-label={t('life.notice.region')} aria-live="polite">
      {visible.length > 0 && <ToastList notices={visible} />}
      {quiet.map(n => <Expire key={n.id} id={n.id} />)}
    </div>
  );
}

/** Невидимое сообщение снимается через тот же срок, что и видимое. */
function Expire({ id }: { id: number }) {
  const adapter = useAdapter();
  useEffect(() => {
    const timer = setTimeout(() => adapter.dismissNotice(id), SHOW_MS);
    return () => clearTimeout(timer);
  }, [adapter, id]);
  return null;
}

function ToastList({ notices }: { notices: Notice[] }) {
  const texts = useCoreView(lifeNoticeTexts);
  const reduced = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {notices.slice(-3).map(n => (
        <motion.div
          key={n.id}
          className="lf-toast"
          layout={!reduced}
          initial={reduced ? false : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: reduced ? 0 : 0.14 } }}
          transition={{ duration: 0.22 }}
        >
          <Toast notice={n} text={noticeText(n, texts)} />
        </motion.div>
      ))}
    </AnimatePresence>
  );
}

function Toast({ notice, text }: { notice: Notice; text: string }) {
  const adapter = useAdapter();
  useEffect(() => {
    const id = setTimeout(() => adapter.dismissNotice(notice.id), SHOW_MS);
    return () => clearTimeout(id);
  }, [adapter, notice.id]);
  return (
    <>
      <p className="lf-toast__text">{text}</p>
      <button type="button" className="lf-toast__x" aria-label={t('life.notice.dismiss')} onClick={() => adapter.dismissNotice(notice.id)}>
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" /></svg>
      </button>
    </>
  );
}

function noticeText(n: Notice, x: LifeNoticeTexts | null): string {
  const fallback = t('notice.ffStopped');
  switch (n.kind) {
    case 'ffStopped': {
      const byReason: Record<string, string | undefined> = { kidLost: x?.kidLost, bigDx: x?.bigDx, kidDx: x?.kidDx, jobLost: x?.jobLost };
      return (n.detail && byReason[n.detail]) || x?.ffStopped || fallback;
    }
    case 'jobLost':
      return (n.detail === 'owner' ? x?.businessClosed : x?.jobLost) || t('life.notice.jobLost');
    case 'focusPause':
      return x?.focusPause || t('life.notice.focus');
    case 'saved':
      return t('life.notice.saved');
    // Не показываются (см. shown): на случай прямого вызова — нейтральные строки.
    case 'spend':
      return t('life.notice.spend');
    case 'noEnergy':
      return t('life.notice.noEnergy');
    case 'coreError':
      return t('life.notice.coreError');
  }
}
