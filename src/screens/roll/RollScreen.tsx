// «2 · Birth roll» (RollCute.dc.html): планета крутится как рулетка, под
// заголовком мелькают страны, затем она останавливается на месте рождения.
// Страна уже выбрана core (startLife) до открытия экрана: анимация только
// повторяет результат. Пропуск, повтор и сокращённое движение не трогают игру.
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import spec from '../../design/motion.json';
import { t } from '../../i18n';
import { gestureId, useAdapter, useCoreView, useSnapshot } from '../../adapters/useGame';
import { rollVM, type RollVM } from '../../adapters/vm/roll';
import type { Nav } from '../../flow/FlowHost';
import { ChunkyButton, RoundButton } from '../../ui/components';
import { ReplayIcon } from '../../ui/icons';
import { Globe, type GlobeTarget } from '../../ui/globe/Globe';
import { useReducedMotion } from '../../ui/motionPrefs';
import type { ScreenProps } from '../registry';
import { capFirst, fmtInt, useFitSize } from '../start/shared';
import './roll.css';

const R = spec.sequences.roll;
type Stage = 'wait' | 'spin' | 'landed' | 'revealed';
const bezier = (k: keyof typeof spec.easing) => `cubic-bezier(${(spec.easing[k] as number[]).join(',')})`;
const ROOT_VARS = {
  '--rl-label-ms': `${R.label.durationMs}ms`,
  '--rl-label-ease': bezier('pop'),
  '--rl-label-from': String(R.label.scale[0]),
  '--rl-reveal-ms': `${R.reveal.durationMs}ms`,
  '--rl-reveal-y': `${R.reveal.translateY[0]}px`,
  '--rl-cta-delay': `${R.reveal.ctaDelayMs}ms`,
} as CSSProperties;

/**
 * Декоративная последовательность названий: nameFlips − 1 случайных стран
 * (Math.random браузера, с весом доли рождений, как ролик оригинала) и в
 * конце — настоящая страна рождения.
 */
function flipSequence(names: RollVM['names'], final: string): string[] {
  const n = Math.max(2, R.nameFlips);
  const pool = names.map(x => ({ name: capFirst(x.name), w: x.w })).filter(x => x.name !== final && x.w > 0);
  const total = pool.reduce((s, x) => s + x.w, 0);
  const out: string[] = [];
  for (let i = 0; i < n - 1; i++) {
    let pick = pool[0]?.name ?? final;
    if (total > 0) {
      let r = Math.random() * total;
      for (const x of pool) { r -= x.w; if (r <= 0) { pick = x.name; break; } }
    }
    if (out[out.length - 1] === pick && pool.length > 1) { i--; continue; }
    out.push(pick);
  }
  out.push(final);
  return out;
}

export function RollScreen({ nav, active }: ScreenProps) {
  const snap = useSnapshot();
  const data = useCoreView(rollVM);
  if (!data || snap.lifePhase !== 'birth') {
    return (
      <main className="screen rl rl--wait" aria-busy="true">
        <p className="rl__waiting" role="status">{t('roll.loading')}</p>
      </main>
    );
  }
  return <RollView key={`${snap.lifeSeq}-${data.iso}`} data={data} nav={nav} active={active} />;
}

function RollView({ data, nav, active }: { data: RollVM; nav: Nav; active: boolean }) {
  const adapter = useAdapter();
  const snap = useSnapshot();
  const reduced = useReducedMotion();
  const country = capFirst(data.country);
  const [run, setRun] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const [stage, setStage] = useState<Stage>('wait');
  const [flipIdx, setFlipIdx] = useState(0);
  const [seq, setSeq] = useState(() => flipSequence(data.names, country));
  const [opening, setOpening] = useState(false);
  const [globeBox, size] = useFitSize<HTMLDivElement>(290);
  const instant = reduced || skipped;
  const shown: Stage = instant ? 'revealed' : stage;
  const landed = shown === 'landed' || shown === 'revealed';
  const revealed = shown === 'revealed';
  const lastFlip = seq.length - 1;

  // Хронология рулетки (motion.json sequences.roll): только показ.
  useEffect(() => {
    if (instant) return;
    let raf = 0;
    let t0 = 0;
    const tick = () => {
      const p = Math.min(1, (performance.now() - t0) / R.spinMs);
      setFlipIdx(Math.min(lastFlip, Math.floor((1 - Math.pow(1 - p, 2)) * (lastFlip + 1))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    const a = setTimeout(() => { t0 = performance.now(); setStage('spin'); raf = requestAnimationFrame(tick); }, R.startDelayMs);
    const b = setTimeout(() => { setFlipIdx(lastFlip); setStage('landed'); }, R.startDelayMs + R.spinMs);
    const c = setTimeout(() => setStage('revealed'), R.startDelayMs + R.spinMs + R.revealDelayMs);
    return () => { clearTimeout(a); clearTimeout(b); clearTimeout(c); cancelAnimationFrame(raf); };
  }, [run, instant, lastFlip]);

  const target = useMemo<GlobeTarget | null>(
    () => (data.coords ? { lat: data.coords.lat, lon: data.coords.lon, label: t('globe.landed', { place: data.placeFull }) } : null),
    [data.coords?.lat, data.coords?.lon, data.placeFull],
  );

  const skip = () => setSkipped(true);
  const replay = () => {
    if (reduced) return;
    setSkipped(false);
    setStage('wait');
    setFlipIdx(0);
    setSeq(flipSequence(data.names, country));
    setRun(r => r + 1);
  };
  const openingRef = useRef(false);
  const onWho = () => {
    if (!active || openingRef.current || !snap.companionsReady) return;
    openingRef.current = true;
    setOpening(true);
    if (adapter.revealCertificate(gestureId())) nav.go({ id: 'certificate', filled: false });
    else { openingRef.current = false; setOpening(false); }
  };

  const name = landed ? country : seq[Math.min(flipIdx, lastFlip)] ?? country;
  const chars = [...name].length;
  const lines = chars > 18 ? 2 : 1;
  const nameVars = { '--len': String(lines === 1 ? chars : Math.ceil(chars / 2) + 2) } as CSSProperties;
  const oneIn = data.shareOneIn > 0
    ? data.pastYear != null
      ? t(data.byPopulation ? 'roll.oneInPopPast' : 'roll.oneInBirthsPast', { year: data.pastYear, n: fmtInt(data.shareOneIn), pct: data.share })
      : t(data.byPopulation ? 'roll.oneInPop' : 'roll.oneInBirths', { n: fmtInt(data.shareOneIn), pct: data.share })
    : '';

  return (
    <main className="screen rl" style={ROOT_VARS} data-stage={shown} data-instant={instant || undefined}>
      <div className="sky-glow rl__glow" aria-hidden="true" />
      {revealed && !reduced && (
        <div className="rl__corner">
          <RoundButton className="rl__replay" onClick={replay} aria-label={t('roll.replay')}><ReplayIcon size={18} /></RoundButton>
        </div>
      )}

      <div className="rl__col">
        <p className="rl__label" data-on={landed || undefined}>{landed ? t('roll.bornIn') : t('roll.where')}</p>
        <p className="rl__name k-big" aria-hidden="true" data-lines={lines} data-on={landed || undefined} style={nameVars}>{name}</p>
        <p className="sr-only" role="status">{landed ? t('roll.status', { place: data.placeFull }) : ''}</p>

        <div ref={globeBox} className="rl__globe">
          {size > 0 && (
            <Globe
              key={instant ? 'instant' : 'anim'}
              size={size}
              target={target}
              focus={!!target && shown !== 'wait'}
              turns={R.turns}
              durationMs={R.spinMs}
              zoom={R.zoom}
              startLon={-40}
              reducedMotion={instant}
              idleLabel={t('globe.idle')}
            />
          )}
        </div>

        <div className="rl__info">
          <p className="rl__hint" aria-hidden={landed || undefined}>{t('roll.hint')}</p>
          <div className="rl__reveal" aria-hidden={!revealed || undefined}>
            <span className="rl__chip">
              <svg className="rl__pin" width="26" height="30" viewBox="0 0 24 28" aria-hidden="true">
                <path d="M12 26s-8.5-7.6-8.5-14.4a8.5 8.5 0 0 1 17 0C20.5 18.4 12 26 12 26Z" fill="#ff6f8a" stroke="#7b4b2a" strokeWidth="2" strokeLinejoin="round" />
                <circle cx="12" cy="11.5" r="3.2" fill="#ffffff" stroke="#7b4b2a" strokeWidth="1.8" />
              </svg>
              <span className="rl__chip-text">{capFirst(data.place)}</span>
            </span>
            <p className="bubble rl__bubble">
              {oneIn}
              <span className="bubble__accent">{data.pastYear != null ? t('roll.thatsYouPast') : t('roll.thatsYou')}</span>
            </p>
          </div>
        </div>

        <div className="rl__cta">
          <p className="rl__comps" role="status">{revealed ? (snap.companionsReady ? '' : t('roll.waitComps')) : ''}</p>
          <div className="rl__slot">
            {revealed ? (
              <ChunkyButton className="rl__who" onClick={onWho} disabled={!snap.companionsReady || opening} aria-busy={!snap.companionsReady || opening || undefined}>
                {t('roll.cta')}
              </ChunkyButton>
            ) : (
              <button type="button" className="pill-btn rl__skip" onClick={skip} aria-label={t('roll.skipLabel')}>{t('roll.skip')}</button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
