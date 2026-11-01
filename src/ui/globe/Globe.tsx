// Планета: орфографическая проекция, полутоновая суша, вращение и вспышки
// рождений. Перенос Globe.dc.html. Вся случайность здесь декоративная и идёт
// из Math.random браузера — у игрового core собственный поток случайности.
import { useEffect, useRef } from 'react';
import { LAND_BITS } from './land';
import motion from '../../design/motion.json';

const D2R = Math.PI / 180;
const TAU = Math.PI * 2;
const BIRTH_ZONES = [
  { lat: [5, 35], lon: [66, 125], w: 1 },
  { lat: [-12, 16], lon: [-18, 45], w: 0.8 },
  { lat: [-35, 25], lon: [-110, -35], w: 0.35 },
  { lat: [25, 55], lon: [-10, 60], w: 0.25 },
  { lat: [20, 50], lon: [-125, -70], w: 0.25 },
] as const;

type LandPoint = [sinLat: number, cosLat: number, lonRad: number, lat: number, lon: number];
let landCache: LandPoint[] | null = null;
function landPoints(): LandPoint[] {
  if (landCache) return landCache;
  const bin = atob(LAND_BITS);
  const W = 240, H = 120, out: LandPoint[] = [];
  for (let r = 0; r < H; r++) {
    const lat = 90 - (r + 0.5) * 1.5;
    const step = Math.max(1, Math.round(1 / Math.cos(lat * D2R)));
    for (let c = 0; c < W; c += step) {
      const i = r * W + c;
      if ((bin.charCodeAt(i >> 3) >> (7 - (i & 7))) & 1) {
        const la = lat * D2R, lon = -180 + (c + 0.5) * 1.5;
        out.push([Math.sin(la), Math.cos(la), lon * D2R, lat, lon]);
      }
    }
  }
  return (landCache = out);
}
const birthWeight = (p: LandPoint) => {
  for (const z of BIRTH_ZONES) if (p[3] >= z.lat[0] && p[3] <= z.lat[1] && p[4] >= z.lon[0] && p[4] <= z.lon[1]) return z.w;
  return 0.05;
};

export type GlobeTarget = { lat: number; lon: number; label: string };

export type GlobeProps = {
  size: number;
  /** Место рождения; при focus планета прокручивается к нему. */
  target?: GlobeTarget | null;
  focus?: boolean;
  turns?: number;
  durationMs?: number;
  zoom?: number;
  startLon?: number;
  reducedMotion?: boolean;
  onLanded?: () => void;
  idleLabel: string;
};

const LOOK = {
  land: '#5bb54a', ocean: '#9fdcf5', shade: '#5cb3e0', night: 'rgba(90,52,24,0.14)', rim: '#7b4b2a',
  flash: '#ff6f8a', marker: '#ff6f8a', markerRing: '#fff3d6', dot: 1.15,
};

export function Globe({ size, target, focus = false, turns = 1, durationMs = 2600, zoom = 1, startLon = -40, reducedMotion = false, onLanded, idleLabel }: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const st = useRef({
    lon: startLon, lat: 12, vel: 0, dragging: false, locked: false, markerT: 0, zoomCur: 1,
    anim: null as null | { t0: number; dur: number; lon0: number; lat0: number; dLon: number; lat1: number; roulette: boolean },
    flashes: [] as { p: LandPoint; t: number }[], flashClock: 0, px: 0, py: 0, pt: 0, last: 0,
  });
  const props = useRef({ target, focus, zoom, onLanded, reducedMotion, size });
  props.current = { target, focus, zoom, onLanded, reducedMotion, size };

  const homeLat = () => (props.current.zoom > 1 ? props.current.target?.lat ?? 18 : 18);

  // Переход в фокус запускает рулетку, выход — возвращает вращение.
  useEffect(() => {
    const s = st.current;
    const t = props.current.target;
    if (focus && t) {
      if (reducedMotion) {
        s.lon = t.lon; s.lat = homeLat(); s.locked = true; s.anim = null; s.markerT = 1; s.zoomCur = zoom;
        onLanded?.();
        return;
      }
      const back = (((s.lon - t.lon) % 360) + 360) % 360;
      s.anim = { t0: performance.now(), dur: durationMs, lon0: s.lon, lat0: s.lat, dLon: -(back + 360 * Math.max(1, Math.round(turns))), lat1: homeLat(), roulette: turns > 1 };
      s.vel = 0;
    } else {
      s.anim = null;
      s.locked = false;
    }
    // Только смена фокуса; остальные значения читаются через props.current.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  useEffect(() => {
    const pts = landPoints();
    const s = st.current;
    s.last = performance.now();
    let raf = 0;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const cv = canvasRef.current;
      if (!cv) return;
      const { size: S, target: home, focus: focused, zoom: zoomTo, reducedMotion: still } = props.current;
      const dt = Math.min(0.05, (now - s.last) / 1000);
      s.last = now;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const px = Math.round(S * dpr);
      if (cv.width !== px || cv.height !== px) { cv.width = px; cv.height = px; }
      const g = cv.getContext('2d');
      if (!g) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, S, S);

      if (s.anim) {
        const a = s.anim;
        const t = Math.min(1, (now - a.t0) / a.dur);
        const e = a.roulette ? 1 - Math.pow(1 - t, 4) : t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        s.lon = a.lon0 + a.dLon * e;
        s.lat = a.lat0 + (a.lat1 - a.lat0) * e;
        if (t >= 1) { s.anim = null; s.locked = true; props.current.onLanded?.(); }
      } else if (!s.dragging) {
        const spin = still ? 0 : motion.globe.idleSpinDegPerSec;
        s.lon += (s.locked ? 0 : -spin) * dt + s.vel * dt;
        s.vel *= Math.pow(motion.globe.inertiaKeepPerSec, dt);
        if (!s.locked) s.lat += (motion.globe.latRest - s.lat) * Math.min(1, dt * motion.globe.latRelax);
      }
      const showMarker = !!(focused && home && !s.anim);
      s.markerT += ((showMarker ? 1 : 0) - s.markerT) * Math.min(1, dt * motion.globe.markerRate);
      s.zoomCur += ((showMarker ? zoomTo : 1) - s.zoomCur) * Math.min(1, dt * motion.globe.zoomRate);

      const R0 = S / 2 - S * 0.06, R = R0 * s.zoomCur, cx = S / 2, cy = S / 2;
      const lam0 = s.lon * D2R, ph0 = s.lat * D2R, sp0 = Math.sin(ph0), cp0 = Math.cos(ph0);
      const Lx = -0.42, Ly = 0.48, Lz = 0.77;
      const project = (sl: number, cl: number, lo: number) => {
        const dl = lo - lam0, cd = Math.cos(dl);
        const x = cl * Math.sin(dl), y = cp0 * sl - sp0 * cl * cd, z = sp0 * sl + cp0 * cl * cd;
        return [cx + R * x, cy - R * y, z, x, y] as const;
      };

      g.save();
      g.beginPath(); g.arc(cx, cy, R0, 0, TAU); g.clip();
      const sea = g.createRadialGradient(cx + Lx * R * 0.55, cy - Ly * R * 0.55, R * 0.05, cx, cy, R * 1.02);
      sea.addColorStop(0, LOOK.ocean); sea.addColorStop(1, LOOK.shade);
      g.fillStyle = sea; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();

      const base = LOOK.dot * R0 / 150 * (1 + (s.zoomCur - 1) * 0.55);
      g.fillStyle = LOOK.land;
      for (const p0 of pts) {
        const p = project(p0[0], p0[1], p0[2]);
        if (p[2] <= 0.02) continue;
        const light = Math.max(0, p[3] * Lx + p[4] * Ly + p[2] * Lz);
        g.beginPath(); g.arc(p[0], p[1], base * (0.3 + 1.3 * light), 0, TAU); g.fill();
      }
      const sh = g.createRadialGradient(cx + Lx * R * 0.7, cy - Ly * R * 0.7, R * 0.2, cx, cy, R * 1.05);
      sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, LOOK.night);
      g.fillStyle = sh; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();

      // Вспышки рождений — только украшение.
      s.flashClock -= dt;
      if (!still && s.flashClock <= 0 && s.markerT < 0.5) {
        const [lo, hi] = motion.globe.flash.everySec as [number, number];
        s.flashClock = lo + Math.random() * (hi - lo);
        let pick = pts[(Math.random() * pts.length) | 0]!;
        for (let tries = 0; tries < 8; tries++) {
          const c = pts[(Math.random() * pts.length) | 0]!;
          if (Math.random() < birthWeight(c)) { pick = c; break; }
        }
        s.flashes.push({ p: pick, t: 0 });
        if (s.flashes.length > motion.globe.flash.maxAlive) s.flashes.shift();
      }
      g.strokeStyle = LOOK.flash; g.fillStyle = LOOK.flash; g.lineWidth = 1.2;
      for (let f = s.flashes.length - 1; f >= 0; f--) {
        const fl = s.flashes[f]!;
        fl.t += dt / motion.globe.flash.lifeSec;
        if (fl.t >= 1) { s.flashes.splice(f, 1); continue; }
        const fp = project(fl.p[0], fl.p[1], fl.p[2]);
        if (fp[2] <= 0.1) continue;
        g.globalAlpha = (1 - fl.t) * fp[2];
        g.beginPath(); g.arc(fp[0], fp[1], base * 2 + fl.t * R0 * 0.09, 0, TAU); g.stroke();
        g.beginPath(); g.arc(fp[0], fp[1], base * 1.6, 0, TAU); g.fill();
      }
      g.globalAlpha = 1;

      if (home && s.markerT > 0.01) {
        const hl = home.lat * D2R;
        const mp = project(Math.sin(hl), Math.cos(hl), home.lon * D2R);
        if (mp[2] > 0) {
          const phase = (now / motion.globe.marker.loopMs) % 1;
          g.strokeStyle = LOOK.marker; g.fillStyle = LOOK.marker; g.lineWidth = 1.5;
          for (let k = 0; k < 2; k++) {
            const pt = (phase + k * 0.5) % 1;
            g.globalAlpha = s.markerT * (1 - pt);
            g.beginPath(); g.arc(mp[0], mp[1], 5 + pt * R0 * 0.16, 0, TAU); g.stroke();
          }
          g.globalAlpha = s.markerT;
          g.beginPath(); g.arc(mp[0], mp[1], 5.5, 0, TAU); g.fill();
          g.lineWidth = 2; g.strokeStyle = LOOK.markerRing; g.stroke();
          g.globalAlpha = 1;
        }
      }
      g.restore();
      g.strokeStyle = LOOK.rim; g.lineWidth = Math.max(1, R0 / 90);
      g.beginPath(); g.arc(cx, cy, R0, 0, TAU); g.stroke();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = st.current;
    // Во время рулетки планету не крутим: место рождения уже определено.
    if (s.anim) return;
    s.dragging = true; s.px = e.clientX; s.py = e.clientY; s.pt = performance.now(); s.vel = 0;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* старые браузеры */ }
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = st.current;
    if (!s.dragging) return;
    const R = (size / 2 - size * 0.06) * (s.zoomCur || 1);
    const now = performance.now(), dts = Math.max(0.008, (now - s.pt) / 1000);
    const dLon = -(e.clientX - s.px) / R / D2R;
    s.lon += dLon;
    s.lat = Math.max(-motion.globe.dragLatClamp, Math.min(motion.globe.dragLatClamp, s.lat + (e.clientY - s.py) / R / D2R));
    s.vel = 0.5 * s.vel + 0.5 * dLon / dts;
    s.px = e.clientX; s.py = e.clientY; s.pt = now;
  };
  const onUp = () => { st.current.dragging = false; };

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={focus && target ? target.label : idleLabel}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      style={{ display: 'block', width: size, height: size, touchAction: 'none', cursor: 'grab' }}
    />
  );
}
