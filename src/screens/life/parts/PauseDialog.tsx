// Окно паузы (LiveCutePause.dc.html, v107): игра стоит на собственной паузе
// оригинала (S.paused). Resume и крестик снимают паузу; Exit to hub
// сохраняет жизнь (как #quitBtn оригинала) и ведёт в хаб; Skip to the end
// проживает остаток жизни без игрока (adapter.skipToEnd: решения отвечает
// autoChoice оригинала). Окно закрывается само: на время пропуска снимок
// приходит с skipping, после — со смертью.
import { useId, useRef } from 'react';
import { t } from '../../../i18n';
import { gestureId, useAdapter } from '../../../adapters/useGame';
import type { LifeVM } from '../../../adapters/viewModels';
import type { Nav } from '../../../flow/FlowHost';
import { LifeDialog } from './LifeDialog';
import { BigPauseGlyph, HourglassGlyph, HouseGlyph, ResumeGlyph, SkipGlyph, XGlyph } from './lifeIcons';

export function PauseDialog({ open, life, nav }: { open: boolean; life: LifeVM; nav: Nav }) {
  const adapter = useAdapter();
  const titleId = useId();
  const last = useRef(-Infinity);
  const once = () => {
    const now = performance.now();
    if (now - last.current < 400) return false;
    last.current = now;
    return true;
  };
  const resume = () => {
    if (!once()) return;
    adapter.setPaused(gestureId(), false);
  };
  const exit = () => {
    if (!once()) return;
    if (adapter.leaveLife(gestureId())) nav.go({ id: 'hub' });
  };
  const skip = async () => {
    if (!once()) return;
    // Id жеста создаётся синхронно в обработчике касания. Ошибка core (false)
    // оставляет жизнь идти дальше; сообщение об ошибке показывает LifeToasts.
    await adapter.skipToEnd(gestureId());
  };
  const status = life.year != null
    ? t('pause.status', { name: life.given, age: life.age, year: life.year })
    : t('life.pauseStatusNoYear', { name: life.given, age: life.age });
  return (
    <LifeDialog
      open={open}
      variant="pause"
      title={t('pause.title')}
      titleId={titleId}
      contentKey="pause"
      medallion={<BigPauseGlyph />}
      onEscape={resume}
      below={
        <button type="button" className="ld-close" aria-label={t('pause.close')} onClick={resume}><XGlyph /></button>
      }
    >
      <p className="ld-status"><HourglassGlyph /><span>{status}</span></p>
      <div className="ld__scroll scroll">
        <p className="ld-bubble ld-bubble__text ld-bubble--center">{t('pause.body')}</p>
      </div>
      <div className="ld-actions">
        <button type="button" className="ld-cta k-o" onClick={resume}><ResumeGlyph />{t('pause.resume')}</button>
        <div className="ld-row">
          <button type="button" className="ld-exit" onClick={exit}><HouseGlyph />{t('pause.exit')}</button>
          <button type="button" className="ld-exit ld-exit--skip" onClick={() => void skip()}><SkipGlyph />{t('life.pauseSkip')}</button>
        </div>
      </div>
    </LifeDialog>
  );
}
