// «2 · Birth roll» (RollCute холста, вариант F): планета крупно посередине; палец
// «смахивает» пунктирную орбиту, и слова «каждое рождение — бросок костей» объезжают
// планету. Spin! (или смахнуть саму планету) запускает бросок: планета крутится и
// останавливается на стране рождения, приближается к ней одним движением, ставит
// булавку с местом; поднимается сводка о стране, на месте Spin! — Meet me!, рядом —
// переброс. Тап во время вращения ускоряет его.
// Страна уже выбрана core (startLife) до открытия экрана: планета получает её как
// «судьбу» (PlanetStage) и только показывает результат. Переброс — новая жизнь без
// энергии (adapter.rerollLife). Планета общая, под экраном; экран слушает её шину.
import { useEffect, useMemo, useRef, useState } from 'react';
import { t } from '../../i18n';
import { gestureId, useAdapter, useSnapshot } from '../../adapters/useGame';
import { rollVM } from '../../adapters/vm/roll';
import { Frame, useFrame } from '../../ui/frame/Frame';
import { CtaButton } from '../../ui/frame/parts';
import { useReducedMotion } from '../../ui/motionPrefs';
import { planetBus, usePlanetEvents } from '../../ui/planet/bus';
import { layRoll } from '../layouts';
import type { ScreenProps } from '../registry';
import { capFirst, fmtInt } from '../start/shared';
import type { Land } from './luck';
import { RerollButton } from './RerollButton';
import { spendReroll } from './rerolls';
import { Summary } from './Summary';
import './roll.css';

type Phase = 'idle' | 'spin' | 'landed' | 'revealed';
/** Кегль названия страны: помещается в 330 (RollCute nameSize). */
const nameSize = (name: string) => Math.max(28, Math.min(52, Math.floor(330 / Math.max(1, [...name].length * 0.58))));

export function RollScreen({ nav, active }: ScreenProps) {
  const adapter = useAdapter();
  const snap = useSnapshot();
  const frame = useFrame();
  const reduced = useReducedMotion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const data = useMemo(() => (snap.status === 'ready' && snap.lifePhase === 'birth' ? adapter.view(rollVM) : null), [adapter, snap.status, snap.lifePhase, snap.lifeSeq]);
  const L = layRoll(frame);
  const [phase, setPhase] = useState<Phase>('idle');
  const [center, setCenter] = useState('');
  const [land, setLand] = useState<Land | null>(null);
  const [touched, setTouched] = useState(false);
  const [fast, setFast] = useState(false);
  const [busy, setBusy] = useState(false);

  usePlanetEvents((type, p) => {
    if (type === 'touch') setTouched(true);
    else if (type === 'hurry') setFast(true);
    else if (type === 'roll') {
      setPhase('spin'); setCenter(''); setLand(null); setFast(false);
      // Сокращённое движение: бросок сразу доигрывается (как после тапа).
      if (reduced) planetBus.emit('cmd', 'hurry');
    } else if (type === 'center') setCenter(String(p ?? ''));
    else if (type === 'land') { setPhase('landed'); setLand(p as Land); }
    else if (type === 'dive' && p === 'in') setPhase('revealed');
    else if (type === 'dive' && p === 'out') { setPhase('idle'); setLand(null); setCenter(''); setTouched(false); }
  }, active);

  const idle = phase === 'idle';
  const landed = phase === 'landed' || phase === 'revealed';
  const revealed = phase === 'revealed';
  // Название страны — из core (историческое для жизней в прошлом); пока планета крутится — страна под её серединой.
  const country = landed ? capFirst(data?.country ?? land?.short ?? '') : phase === 'spin' ? capFirst(center) : '';
  const ready = !!data && snap.status === 'ready';

  const spin = () => { if (active && ready && idle) planetBus.emit('cmd', 'spin'); };
  const opening = useRef(false);
  const onMeet = () => {
    if (!active || busy || opening.current || !snap.companionsReady) return;
    opening.current = true;
    if (adapter.revealCertificate(gestureId())) nav.go({ id: 'certificate', filled: false });
    else opening.current = false;
  };
  // Переброс: сначала команда (новая жизнь и новая «судьба» планеты), затем планета отъезжает.
  const reroll = async () => {
    if (!active || busy || opening.current) return;
    setBusy(true);
    const ok = await adapter.rerollLife(gestureId(), adapter.getSnapshot().lifeSeq);
    setBusy(false);
    if (!ok) return;
    spendReroll();
    setPhase('idle'); setLand(null); setCenter(''); setTouched(false);
    planetBus.emit('cmd', 'reroll');
  };

  const oneIn = data && data.shareOneIn > 0
    ? data.pastYear != null
      ? t(data.byPopulation ? 'roll.oneInPopPast' : 'roll.oneInBirthsPast', { year: data.pastYear, n: fmtInt(data.shareOneIn), pct: data.share })
      : t(data.byPopulation ? 'roll.oneInPop' : 'roll.oneInBirths', { n: fmtInt(data.shareOneIn), pct: data.share })
    : '';
  const size = nameSize(country);

  return (
    <main className="pscreen over-planet rl" data-phase={phase} data-fast={fast || undefined}>
      <Frame>
        <p className="rl-label" data-on={landed || undefined} style={{ top: L.label }}>{landed ? t('roll.bornIn') : t('roll.where')}</p>
        <p className="rl-name" aria-hidden="true" data-on={landed || undefined} style={{ top: L.name, fontSize: size, WebkitTextStroke: `${(size / 52 * 5).toFixed(1)}px #5a3418`, textShadow: `0 ${(size / 52 * 4).toFixed(1)}px 0 #5a3418` }}>{country}</p>
        <p className="sr-only" role="status">{landed && data ? t('roll.status', { place: data.placeFull }) : !ready ? t('roll.loading') : ''}</p>

        <OrbitHint cx={L.planet.cx} cy={L.planet.cy} k={L.k} shown={idle} hand={idle && !touched} still={reduced} />

        <Summary land={land} shown={revealed} fast={fast} style={{ bottom: L.summaryBottom }} fallback={oneIn} />

        <CtaButton className="rl-cta rl-spin" style={{ top: L.cta }} label={t('roll.spin')} aria-label={t('roll.spinLabel')} onClick={spin} disabled={!ready} tabIndex={idle ? 0 : -1} />
        <CtaButton className="rl-cta rl-meet" style={{ top: L.cta }} label={t('roll.meet')} onClick={onMeet} disabled={!snap.companionsReady || busy} aria-busy={!snap.companionsReady || undefined} tabIndex={revealed ? 0 : -1} />
        <RerollButton className="rl-again" style={{ top: L.cta + 3 }} onClick={reroll} disabled={busy} tabIndex={revealed ? 0 : -1} />
        <p className="rl-wait" role="status" style={{ top: L.cta + 76 }}>{revealed && !snap.companionsReady ? t('roll.waitComps') : ''}</p>
      </Frame>
    </main>
  );
}

/**
 * Орбита вокруг планеты с надписью и пальцем-подсказкой (RollCute ANIM): палец входит
 * слева, быстро «смахивает» вправо, слова один раз объезжают планету (за ней их не
 * видно) и останавливаются спереди; затем снова. Цикл 4,4 с. Координаты — макета
 * (планета 368 с центром 196,5 × 386); группа сдвинута и сжата под место планеты.
 */
function OrbitHint({ cx, cy, k, shown, hand, still }: { cx: number; cy: number; k: number; shown: boolean; hand: boolean; still: boolean }) {
  const root = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const r = root.current;
    if (!r || !shown || still) return;
    const handEl = r.querySelector<HTMLElement>('.rl-hand');
    const tps = r.querySelectorAll<SVGTextPathElement>('.rl-tp');
    const txts = r.querySelectorAll<SVGTextElement>('.rl-txt');
    const dashes = r.querySelectorAll<SVGPathElement>('.rl-dash');
    let raf = 0;
    const tick = () => {
      const c = performance.now() % 4400;
      let u = 0, a = 0, tilt = 0, sc = 1;
      if (c < 420) {
        // Палец появляется слева на орбите и «нажимает».
        const q = c / 420; a = q; u = 0.04; sc = 1.12 - 0.22 * q; tilt = -4 - 6 * q;
      } else if (c < 820) {
        // Быстрый взмах вправо с наклоном, в конце палец исчезает.
        const q = (c - 420) / 400, e = 1 - Math.pow(1 - q, 3);
        u = 0.04 + 0.92 * e; a = 1 - Math.max(0, (q - 0.55) / 0.45); sc = 0.9; tilt = -10 + 34 * Math.sin(Math.min(1, q * 1.25) * Math.PI / 2);
      } else { a = 0; u = 0.96; }
      const v = 1 - u;
      const x = v * v * 77.8 + 2 * v * u * 196.5 + u * u * 315.2;
      const y = v * v * 446.3 + 2 * v * u * 478.1 + u * u * 446.3;
      if (handEl) {
        handEl.style.opacity = a.toFixed(3);
        handEl.style.transform = `translate(${(x - 18).toFixed(1)}px, ${(y - 5.6).toFixed(1)}px) rotate(${tilt.toFixed(1)}deg) scale(${sc.toFixed(3)})`;
      }
      // Слова уезжают вслед за пальцем: один круг, сначала быстро, и останавливаются спереди.
      const tt = (c - 520) / 2900, p = tt <= 0 ? 0 : tt >= 1 ? 1 : 1 - Math.pow(1 - tt, 3);
      const off = `${(100 / 6 + (p * 100) / 3).toFixed(3)}%`;
      tps.forEach(el => el.setAttribute('startOffset', off));
      // Инерция: сразу после толчка буквы чуть расходятся и снова сходятся.
      const spread = tt > 0 && tt < 0.36 ? Math.sin((Math.PI * tt) / 0.36) : 0;
      txts.forEach(el => { el.style.letterSpacing = `${(1.8 + 3.4 * spread).toFixed(2)}px`; });
      dashes.forEach(el => { el.style.strokeDashoffset = (-p * 871).toFixed(1); });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [shown, still]);

  const text = t('roll.orbit');
  const words = (
    <text className="rl-txt" fontSize="15" fontWeight="700" letterSpacing="1.8" fill="#ffffff" stroke="#5a3418" strokeWidth="3" strokeLinejoin="round" paintOrder="stroke">
      <textPath className="rl-tp" href="#rl-orbit" startOffset={still ? '50%' : '16.667%'} textAnchor="middle"><tspan dy="-5">{text}</tspan></textPath>
    </text>
  );
  return (
    <div ref={root} className="rl-orbit" aria-hidden="true" data-on={shown || undefined} style={{ transform: `translate(${cx}px, ${cy}px) scale(${k}) translate(-196.5px, -386px)` }}>
      <svg width="393" height="852" viewBox="0 0 393 852">
        <defs>
          <clipPath id="rl-front"><rect x="-60" y="411.8" width="513" height="300" /></clipPath>
          <clipPath id="rl-back"><rect x="-60" y="111.8" width="513" height="300" /></clipPath>
          <mask id="rl-disc" maskUnits="userSpaceOnUse" x="-60" y="0" width="513" height="852">
            <rect x="-60" y="0" width="513" height="852" fill="#ffffff" />
            <circle cx="196.5" cy="386" r="163.9" fill="#000000" />
          </mask>
          <path id="rl-orbit" d="M196.5 367.6A191.4 44.2 0 0 0 196.5 456.0A191.4 44.2 0 0 0 196.5 367.6A191.4 44.2 0 0 0 196.5 456.0A191.4 44.2 0 0 0 196.5 367.6A191.4 44.2 0 0 0 196.5 456.0A191.4 44.2 0 0 0 196.5 367.6" fill="none" />
        </defs>
        <g mask="url(#rl-disc)"><path className="rl-dash" d="M387.9 411.8A191.4 44.2 0 0 0 5.1 411.8" fill="none" stroke="#5a3418" strokeWidth="2" strokeLinecap="round" strokeDasharray="14 12" opacity="0.7" /></g>
        <path className="rl-dash" d="M5.1 411.8A191.4 44.2 0 0 0 387.9 411.8" fill="none" stroke="#5a3418" strokeWidth="2" strokeLinecap="round" strokeDasharray="14 12" opacity="0.95" />
        <g clipPath="url(#rl-back)" mask="url(#rl-disc)">{words}</g>
        <g clipPath="url(#rl-front)">{words}</g>
      </svg>
      <div className="rl-hand-box" data-on={hand || undefined}>
        <div className="rl-hand">
          <svg width="40" height="40" viewBox="0 0 24 24">
            <path d="M9 11V5.5a1.8 1.8 0 0 1 3.6 0V11M12.6 10.2a1.8 1.8 0 0 1 3.6 0V12M16.2 11a1.8 1.8 0 0 1 3.6 0v3.5c0 3.6-2.6 6.5-6.2 6.5h-1c-2.2 0-3.6-.9-4.9-2.5L4.6 14.8a1.7 1.7 0 0 1 2.6-2.2L9 14.5V11" fill="#fffaf0" stroke="#5a3418" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}
