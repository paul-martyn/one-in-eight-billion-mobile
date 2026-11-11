// Общая планета экранов до жизни (язык, старт, хаб): одна на все, нарисована
// вместе с «бумагой» под этими экранами. Экраны над ней прозрачные и пропускают
// касания; при переходе между ними планета перелетает на новое место и
// продолжает вращаться (Prototype холста, stage). После других экранов планета
// просто появляется на своём месте вместе с новым экраном.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAdapter, useSnapshot } from '../adapters/useGame';
import { t, useLocale } from '../i18n';
import { extrasOf, hasPlanet, layHub, planetPlace } from '../screens/layouts';
import { Frame, useFrame } from '../ui/frame/Frame';
import { Planet } from '../ui/planet/Planet';
import { planetBus } from '../ui/planet/bus';
import type { FlowState, ScreenId, TransitionKind } from './flow';

export const GLIDE_MS = 750;

export function PlanetStage({ flow, kind }: { flow: FlowState; kind: TransitionKind }) {
  const frame = useFrame();
  const snap = useSnapshot();
  const adapter = useAdapter();
  const locale = useLocale();
  const cur = flow.screen.id;
  const prev = flow.leaving?.id ?? null;
  const curP = hasPlanet(cur);
  const prevP = !!prev && hasPlanet(prev);
  const shown = curP || prevP;

  // Планета создаётся при первом экране с ней и дальше живёт (спит, когда не видна).
  const [mounted, setMounted] = useState(false);
  useEffect(() => { if (shown && !mounted) setMounted(true); }, [shown, mounted]);

  const last = useRef<ScreenId>('start');
  if (curP) last.current = cur;
  const at = curP ? cur : prevP ? prev! : last.current;
  const extras = extrasOf(snap);
  const place = planetPlace(at, frame, extras);
  // Возврат после других экранов: планета сразу на месте и проявляется вместе с новым экраном.
  const back = curP && !!prev && !prevP;
  const hubBar = layHub(frame, extras).bar;

  // Названия стран на языке игры (в английском — собственные короткие названия планеты).
  const names = useMemo(
    () => (locale === 'en' || snap.status !== 'ready' ? null : adapter.countryNames()),
    [locale, snap.status, adapter],
  );

  // Пойманное лицо: доллар или кристалл в кошелёк мета-слоя (когда монета долетела).
  useEffect(() => planetBus.on((type, payload) => {
    if (type === 'catch' && (payload === 'coin' || payload === 'gem')) adapter.catchFlash(payload);
  }), [adapter]);

  if (!mounted && !shown) return null;
  return (
    <div
      className="flow__planet"
      data-fade={(back && kind !== 'pop') || undefined}
      style={{ zIndex: back && kind !== 'pop' ? 15 : 5, opacity: shown ? 1 : 0, pointerEvents: curP ? 'auto' : 'none' }}
      aria-hidden={!curP || undefined}
    >
      <Frame>
        <Planet
          width={393}
          height={frame.H}
          cx={place.cx}
          cy={place.cy}
          size={place.size}
          moveMs={back || !mounted ? 0 : GLIDE_MS}
          mode={cur === 'hub' ? 'hub' : 'free'}
          events={cur === 'language' ? 'dots' : 'icons'}
          page="host"
          coinAt={`188,${hubBar + 21}`}
          gemAt={`301,${hubBar + 21}`}
          bus={planetBus}
          names={names}
          pixelScale={frame.k}
          asleep={!shown}
          canOpen={false}
          labels={{ planet: t(cur === 'hub' ? 'planet.hub' : 'planet.free'), perDay: t('planet.perDay'), open: t('planet.open') }}
        />
      </Frame>
    </div>
  );
}
