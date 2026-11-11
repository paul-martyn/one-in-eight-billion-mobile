// Общая планета экранов до жизни (язык, старт, рулетка, хаб): одна на все, нарисована
// вместе с «бумагой» под этими экранами. Экраны над ней прозрачные и пропускают
// касания; при переходе между ними планета перелетает на новое место и
// продолжает вращаться (Prototype холста, stage). После других экранов планета
// просто появляется на своём месте вместе с новым экраном. На рулетке планета получает
// страну и место рождения, уже выбранные core («судьба»), и садится на них.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAdapter, useSnapshot } from '../adapters/useGame';
import { t, useLocale } from '../i18n';
import { rollVM } from '../adapters/vm/roll';
import { extrasOf, hasPlanet, layHub, layHubCountry, layRoll, planetPlace } from '../screens/layouts';
import { capFirst } from '../screens/start/shared';
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
  // Место рождения текущей жизни — для броска планеты (читается раз на жизнь).
  const onRoll = at === 'roll';
  const roll = layRoll(frame);
  const onHub = at === 'hub';
  const country = layHubCountry(frame, extras);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const birth = useMemo(() => (onRoll && snap.status === 'ready' && snap.lifePhase === 'birth' ? adapter.view(rollVM) : null), [adapter, onRoll, snap.status, snap.lifePhase, snap.lifeSeq]);

  // Названия стран на языке игры (в английском — собственные короткие названия планеты).
  const names = useMemo(
    () => (locale === 'en' || snap.status !== 'ready' ? null : adapter.countryNames()),
    [locale, snap.status, adapter],
  );

  // Пойманное лицо: доллар или кристалл в кошелёк мета-слоя (когда монета долетела).
  useEffect(() => planetBus.on((type, payload) => {
    if (type === 'catch' && (payload === 'coin' || payload === 'gem')) adapter.catchFlash(payload);
  }), [adapter]);

  // Ушли с экранов планеты: пока её не видно, она возвращается к целому виду (после рулетки — от страны).
  useEffect(() => { if (mounted && !shown) planetBus.emit('cmd', 'reset'); }, [mounted, shown]);

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
          mode={at === 'roll' ? 'roll' : at === 'hub' ? 'hub' : 'free'}
          events={at === 'language' ? 'dots' : 'icons'}
          fate={birth ? `${birth.iso},${birth.urban ? birth.place : ''}` : ''}
          pinLabel={birth ? capFirst(birth.place) : ''}
          diveY={onRoll ? roll.diveY : onHub ? country.diveY : 0}
          diveR={onRoll ? roll.diveR : onHub ? country.diveR : 150}
          page="host"
          coinAt={`188,${hubBar + 21}`}
          gemAt={`301,${hubBar + 21}`}
          bus={planetBus}
          names={names}
          pixelScale={frame.k}
          asleep={!shown}
          canOpen={onHub}
          labels={{ planet: t(at === 'roll' ? 'roll.planet' : at === 'hub' ? 'planet.hub' : 'planet.free'), perDay: t('planet.perDay'), open: t('planet.open') }}
        />
      </Frame>
    </div>
  );
}
