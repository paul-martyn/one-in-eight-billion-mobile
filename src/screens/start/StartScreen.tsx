// «1 · Start» (StartCute.dc.html): заголовок, планета, реплика, счётчики
// рождений и смертей с открытия экрана и «Be Born!» за 1 энергию (мобильный
// мета-слой, snapshot.meta). Новая жизнь создаётся командой адаптера до
// перехода к рулетке; при сохранённой жизни сначала подтверждение.
import { useCallback, useId } from 'react';
import { t } from '../../i18n';
import { useSnapshot } from '../../adapters/useGame';
import { SoftButton } from '../../ui/components';
import { Globe } from '../../ui/globe/Globe';
import { BornButton, NoEnergyLine } from '../../ui/meta/Meta';
import { useReducedMotion } from '../../ui/motionPrefs';
import type { ScreenProps } from '../registry';
import { NewLifeGuard, useBeBorn } from './newLife';
import { BrandTitle, useContinueLife, useFitSize, WorldCounters } from './shared';
import './start.css';

export function StartScreen({ nav, active }: ScreenProps) {
  const snap = useSnapshot();
  const reduced = useReducedMotion();
  const [globeBox, size] = useFitSize<HTMLDivElement>(280);
  const onStarted = useCallback(() => nav.go({ id: 'roll' }), [nav]);
  const born = useBeBorn(nav, active, onStarted);
  const busy = born.busy;
  const onContinue = useContinueLife(nav);
  const waitId = useId();
  const ready = snap.status === 'ready';
  const resume = snap.resume;
  const meta = born.meta;
  // После начатой жизни (busy) уходящий экран не показывает «нет энергии».
  const noEnergy = !!meta && !meta.canStartLife && !busy;

  return (
    <main className="screen st">
      <div className="sky-glow st__glow" aria-hidden="true" />
      <BrandTitle className="st__title" />
      <div ref={globeBox} className="st__globe">
        {size > 0 && <Globe size={size} startLon={-40} reducedMotion={reduced} idleLabel={t('globe.idle')} />}
      </div>
      <p className="bubble st__bubble">
        {t('start.bubble1')}
        <span className="bubble__accent">{t('start.bubble2')}</span>
      </p>
      <WorldCounters className="st__counters" />
      <div className="st__actions">
        <BornButton
          label={t('start.cta')}
          cost={born.cost}
          onClick={born.request}
          disabled={!ready || busy || !born.canStart}
          aria-busy={busy || undefined}
          aria-describedby={noEnergy ? waitId : undefined}
        />
        {noEnergy && <NoEnergyLine id={waitId} nextRefillAt={meta?.nextRefillAt ?? null} />}
        {resume && (
          <SoftButton className="continue-btn" onClick={onContinue} disabled={!ready || busy}>
            <span className="continue-btn__main">
              {resume.phase === 'birth' ? t('start.continueNewborn', { name: resume.name }) : t('hub.continue', { name: resume.name, age: resume.age })}
            </span>
            <span className="continue-btn__sub">{t('start.continuePlace', { place: resume.place })}</span>
          </SoftButton>
        )}
        <p className="sr-only" role="status">{busy ? t('start.starting') : ''}</p>
      </div>
      <NewLifeGuard {...born.guard} />
    </main>
  );
}
