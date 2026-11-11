// «1 · Start» (StartCute холста): заголовок, общая планета под экраном, облачко,
// счётчики рождений и смертей с открытия игры (их считает сама планета) и
// «Be Born!» 196 × 70 за 1 энергию (мета-слой, snapshot.meta). Экран прозрачный:
// планета живёт под ним (PlanetStage) и принимает касания. Новая жизнь создаётся
// командой адаптера до перехода к рулетке; при сохранённой жизни — подтверждение.
import { useCallback, useId } from 'react';
import { t } from '../../i18n';
import { useSnapshot } from '../../adapters/useGame';
import { SoftButton } from '../../ui/components';
import { Frame, useFrame } from '../../ui/frame/Frame';
import { CtaButton, Say, Since, Title } from '../../ui/frame/parts';
import { NoEnergyLine } from '../../ui/meta/Meta';
import { extrasOf, layStart } from '../layouts';
import type { ScreenProps } from '../registry';
import { NewLifeGuard, useBeBorn } from './newLife';
import { useContinueLife } from './shared';
import './start.css';

export function StartScreen({ nav, active }: ScreenProps) {
  const snap = useSnapshot();
  const frame = useFrame();
  const onStarted = useCallback(() => nav.go({ id: 'roll' }), [nav]);
  const born = useBeBorn(nav, active, onStarted);
  const busy = born.busy;
  const onContinue = useContinueLife(nav);
  const waitId = useId();
  const ready = snap.status === 'ready';
  const resume = snap.resume;
  const meta = born.meta;
  const extras = extrasOf(snap);
  const L = layStart(frame, extras);

  return (
    <main className="pscreen over-planet st">
      <Frame>
        <Title style={{ top: L.title }} />
        <Say className="rise-in" style={{ top: L.say, animationDelay: '0.15s' }} line={t('start.bubble1')} accent={t('start.bubble2')} />
        <Since className="rise-in" style={{ top: L.since, animationDelay: '0.25s' }} />
        <CtaButton
          className="st__cta"
          style={{ top: L.cta }}
          label={t('start.cta')}
          onClick={born.request}
          disabled={!ready || busy || !born.canStart}
          aria-busy={busy || undefined}
          aria-describedby={extras.noEnergy ? waitId : undefined}
        />
        <div className="below" style={{ top: L.below }}>
          {extras.noEnergy && <NoEnergyLine id={waitId} nextRefillAt={meta?.nextRefillAt ?? null} />}
          {extras.resume && resume && (
            <SoftButton className="continue-btn" onClick={onContinue} disabled={!ready || busy}>
              <span className="continue-btn__main">
                {resume.phase === 'birth' ? t('start.continueNewborn', { name: resume.name }) : t('hub.continue', { name: resume.name, age: resume.age })}
              </span>
              <span className="continue-btn__sub">{t('start.continuePlace', { place: resume.place })}</span>
            </SoftButton>
          )}
        </div>
        <p className="sr-only" role="status">{busy ? t('start.starting') : ''}</p>
      </Frame>
      <NewLifeGuard {...born.guard} />
    </main>
  );
}
