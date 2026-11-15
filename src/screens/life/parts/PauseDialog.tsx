// Окно паузы (холст «Пауза · варианты», вариант 1 — выбран 15 ноября 2026): настройки в игре. Игра стоит на
// собственной паузе оригинала (S.paused). В окне: звук и музыка (переключатели), «Закончить жизнь» и ссылки
// на документы; под окном красная «Закрыть» — продолжить жизнь (как и «Назад»/Esc). Медальона, ленты «Пауза»,
// даты и пояснения больше нет.
// «Закончить жизнь» не выходит сразу: окно сменяется подтверждением — жизнь не сохранится, награды за неё не
// будет — с «Отменой» и красной «Закончить жизнь»; у подтверждения нет крестика, «Назад» = «Отмена».
// Закончить = adapter.abandonLife (жизнь уходит в «непрожитые», сохранение стирается), затем хаб.
// «Прожить до конца» в этом окне нет (решение по варианту 1); команда skipToEnd осталась в адаптере.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import spec from '../../../design/motion.json';
import { t } from '../../../i18n';
import { gestureId, useAdapter } from '../../../adapters/useGame';
import type { LifeVM } from '../../../adapters/viewModels';
import type { Nav } from '../../../flow/FlowHost';
import { useBack } from '../../../flow/useBack';
import { CtaButton, CtaText } from '../../../ui/frame/parts';
import type { Field } from '../../../ui/frame/fit';
import { useReducedMotion } from '../../../ui/motionPrefs';
import { setSound, useSound, type SoundKind } from '../../../ui/soundPrefs';
import { LEGAL } from '../../../app/legal';

const POP = spec.sequences.popup;
const POP_EASE = spec.easing.pop as [number, number, number, number];
const TITLE_FIT: Field = [270, 22, 16];
const PAIR_FIT: Field = [132, 21, 14];
const LINE = 'var(--color-line)';

const SpeakerIcon = ({ on }: { on: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3.5 9.2h3.6L12 5v14l-4.9-4.2H3.5Z" fill={on ? 'var(--color-cta)' : 'var(--color-switch-off)'} stroke={LINE} strokeWidth="1.8" strokeLinejoin="round" />
    {on
      ? <path d="M15.4 9.4a3.8 3.8 0 0 1 0 5.2M17.9 7a7.2 7.2 0 0 1 0 10" fill="none" stroke={LINE} strokeWidth="2" strokeLinecap="round" />
      : <path d="M15.5 9.5l5 5M20.5 9.5l-5 5" fill="none" stroke={LINE} strokeWidth="2.2" strokeLinecap="round" />}
  </svg>
);
const NoteIcon = ({ on }: { on: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 17.6V6.4l10.2-2.2v11.2M9 9.2l10.2-2.2" fill="none" stroke={LINE} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    <ellipse cx="6.6" cy="17.8" rx="2.8" ry="2.3" fill={on ? '#b48cff' : 'var(--color-switch-off)'} stroke={LINE} strokeWidth="1.7" />
    <ellipse cx="16.8" cy="15.6" rx="2.8" ry="2.3" fill={on ? '#b48cff' : 'var(--color-switch-off)'} stroke={LINE} strokeWidth="1.7" />
    {on ? null : <><path d="M4.5 4.5l15 15" stroke="var(--color-paper)" strokeWidth="4.6" strokeLinecap="round" /><path d="M4.5 4.5l15 15" stroke={LINE} strokeWidth="2.2" strokeLinecap="round" /></>}
  </svg>
);
/** Крестик «Закрыть»: белые линии с коричневой обводкой (дизайн-код). */
const CloseCross = () => (
  <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
    <g fill="none" strokeLinecap="round">
      <path d="M7.5 7.5l11 11M18.5 7.5l-11 11" stroke="var(--color-ink)" strokeWidth="7.4" />
      <path d="M7.5 7.5l11 11M18.5 7.5l-11 11" stroke="var(--color-white)" strokeWidth="4.2" />
    </g>
  </svg>
);
/** Что теряется: значок вещи с красным крестиком на уголке. */
const Lost = ({ children }: { children: ReactNode }) => (
  <span className="ps-lost" aria-hidden="true">
    <svg width="34" height="34" viewBox="0 0 24 24">{children}</svg>
    <svg className="ps-lost__x" width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="8" fill="var(--color-close-x)" stroke={LINE} strokeWidth="1.6" /><path d="M6 6l6 6M12 6l-6 6" stroke="var(--color-white)" strokeWidth="2.2" strokeLinecap="round" /></svg>
  </span>
);
const FLOPPY = <><path d="M4 4.5h12.5L20 8v11.5H4Z" fill="#9fdcf5" stroke={LINE} strokeWidth="1.8" strokeLinejoin="round" /><path d="M7.5 4.7v4.6h8V4.7M7.5 19.3v-5.6h9v5.6" fill="var(--color-paper)" stroke={LINE} strokeWidth="1.6" strokeLinejoin="round" /></>;
const GEM = <><path d="M12 2.8 L5 12 L12 21.2 Z" fill="#9be57a" /><path d="M12 2.8 L19 12 L12 21.2 Z" fill="#62c43f" /><path d="M12 2.8 L19 12 L12 21.2 L5 12 Z" fill="none" stroke="#2f5a17" strokeWidth="1.6" strokeLinejoin="round" /></>;

function SoundRow({ kind }: { kind: SoundKind }) {
  const on = useSound(kind);
  const name = t(kind === 'sound' ? 'pause.sound' : 'pause.music');
  return (
    <li className="ps-row">
      <span className="ps-row__tile">{kind === 'sound' ? <SpeakerIcon on={on} /> : <NoteIcon on={on} />}</span>
      <span className="ps-row__name">{name}</span>
      <button type="button" role="switch" aria-checked={on} aria-label={name} className="ps-switch" onClick={() => setSound(kind, !on)}>
        <span className="ps-switch__knob" />
      </button>
    </li>
  );
}

export function PauseDialog({ open, nav }: { open: boolean; life?: LifeVM; nav: Nav }) {
  const reduced = useReducedMotion();
  const [step, setStep] = useState<'settings' | 'confirm'>('settings');
  // Каждое открытие паузы начинается с настроек.
  useEffect(() => { if (!open) setStep('settings'); }, [open]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="layer"
          className="ps-layer"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: reduced ? 0 : POP.exit.durationMs / 1000 } }}
          transition={{ duration: POP.backdrop.durationMs / 1000 }}
        >
          <PauseBody step={step} setStep={setStep} nav={nav} reduced={reduced} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PauseBody({ step, setStep, nav, reduced }: { step: 'settings' | 'confirm'; setStep: (s: 'settings' | 'confirm') => void; nav: Nav; reduced: boolean }) {
  const adapter = useAdapter();
  const ref = useRef<HTMLElement | null>(null);
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
  const end = () => {
    if (!once()) return;
    if (adapter.abandonLife(gestureId())) nav.go({ id: 'hub' });
  };
  // Фокус на окне при открытии и смене шага; при закрытии — обратно.
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    return () => { if (prev && prev.isConnected) prev.focus({ preventScroll: true }); };
  }, []);
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, [step]);
  // «Назад» (Esc): в настройках — продолжить жизнь, в подтверждении — «Отмена».
  useBack(() => { if (step === 'confirm') setStep('settings'); else resume(); }, { layer: 'dialog' });
  const enter = reduced ? false : { opacity: 0, scale: 0.94 };
  const pop = { duration: POP.enter.durationMs / 1000, ease: POP_EASE };
  const links = ([['privacy', LEGAL.privacy], ['terms', LEGAL.terms]] as const).filter(([, url]) => url);
  return (
    <div className="ps-wrap">
      {step === 'settings' ? (
        <>
          <motion.section key="settings" ref={ref} className="ps" role="dialog" aria-modal="true" aria-label={t('pause.title')} tabIndex={-1} initial={enter} animate={{ opacity: 1, scale: 1 }} transition={pop}>
            <ul className="ps__rows">
              <SoundRow kind="sound" />
              <SoundRow kind="music" />
            </ul>
            <div className="ps__end">
              <CtaButton label={t('pause.endLife')} onClick={() => setStep('confirm')} />
            </div>
            {links.length ? (
              <div className="ps__links">
                {links.map(([k, url]) => <a key={k} className="ps-link" href={url} target="_blank" rel="noopener noreferrer">{t(`pause.${k}`)}</a>)}
              </div>
            ) : null}
          </motion.section>
          <motion.button type="button" key="close" className="ps-close" aria-label={t('pause.close')} onClick={resume} initial={enter} animate={{ opacity: 1, scale: 1 }} transition={pop}>
            <CloseCross />
          </motion.button>
        </>
      ) : (
        <motion.section key="confirm" ref={ref} className="ps ps--confirm" role="alertdialog" aria-modal="true" aria-labelledby="ps-end-title" aria-describedby="ps-end-lost" tabIndex={-1} initial={enter} animate={{ opacity: 1, scale: 1 }} transition={pop}>
          <h2 id="ps-end-title" className="ps__title"><span className="sr-only">{t('pause.endTitle')}</span><CtaText field={TITLE_FIT} width={290}>{t('pause.endTitle')}</CtaText></h2>
          <ul id="ps-end-lost" className="ps-warn">
            <li><Lost>{FLOPPY}</Lost><span>{t('pause.endNoSave')}</span></li>
            <li><Lost>{GEM}</Lost><span>{t('pause.endNoReward')}</span></li>
          </ul>
          <div className="ps__buttons">
            <button type="button" className="cta" aria-label={t('pause.cancel')} onClick={() => setStep('settings')}><CtaText field={PAIR_FIT} width={140}>{t('pause.cancel')}</CtaText></button>
            <button type="button" className="cta cta--red" aria-label={t('pause.endLife')} onClick={end}><CtaText field={PAIR_FIT} width={140}>{t('pause.endConfirm')}</CtaText></button>
          </div>
        </motion.section>
      )}
    </div>
  );
}
