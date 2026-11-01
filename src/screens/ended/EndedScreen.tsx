// Итоги жизни «This life» (EndCute, холст v107). Приходит со смертью в экране
// жизни (Look back, переход rise); единственная кнопка — To the hub, где ждёт
// окно наград (snapshot.meta.pendingReward). Все данные — endSummary
// (src/adapters/vm/end.ts) над функциями оригинала в песочнице и записи
// журнала последнего года из snapshot.journal; команд игры экран не отправляет.
// Анимации — показ: появление (60 мс), рост полосы возраста (400 + 1200 мс),
// главы по очереди, фигурки и полосы в раскрытых блоках; reduced motion — сразу итог.
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { t } from '../../i18n';
import { useCoreView, useSnapshot } from '../../adapters/useGame';
import type { JournalEntryVM } from '../../adapters/viewModels';
import { endSummary, type EndPersonVM, type EndSummaryVM } from '../../adapters/vm/end';
import { STAT_COLOR, type StatKey } from '../../ui/components';
import { StatIcon } from '../../ui/icons';
import { useReducedMotion } from '../../ui/motionPrefs';
import { PersonPortrait } from '../../ui/people/PersonArt';
import type { ScreenProps } from '../registry';
import './ended.css';

// Тайминги EndCute.dc.html: SHOW_MS, COUNT_AT, COUNT_MS; блок дорисовывается через 60 мс после раскрытия.
const SHOW_MS = 60;
const COUNT_AT = 400;
const COUNT_MS = 1200;
const FILL_MS = 60;
const FIGURES = 20;
const PERSON_BG = ['#ffd9e1', '#d9f2e4', '#dbe9ff', '#fff2c4'];
const STATS: StatKey[] = ['hl', 'h', 'sm', 'so'];
const ICON = {
  end: 'M12 20.8s-8.3-5.1-8.3-11.4A4.6 4.6 0 0 1 12 6.8a4.6 4.6 0 0 1 8.3 2.6c0 6.3-8.3 11.4-8.3 11.4Z',
  last: 'M3 20h18M5.5 20V12h3.5v8M10.5 20V6h3.5v14M15.5 20v-10h3.5v10',
  people: 'M8.5 11a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM15.8 11a2.7 2.7 0 1 0 0-5.4 2.7 2.7 0 0 0 0 5.4ZM2.5 19.5c0-3.4 2.6-5.6 6-5.6s6 2.2 6 5.6ZM13.5 19.5c.2-2.5 1-4.5 2.6-4.9 2.6.1 4.9 1.8 5.4 4.9Z',
  money: 'M3 7h18v11H3ZM12 15.3a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6Z',
} as const;
type BlockKey = keyof typeof ICON;
const TINT: Record<BlockKey, string> = { end: '#ff9a9a', last: '#ffc23d', people: '#4cc9a0', money: '#8fd14f' };

const easeOutCubic = (p: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 3);
const initialOf = (s: string) => [...(s.trim() || '?')][0]!.toLocaleUpperCase();
const capFirst = (s: string) => (s ? s[0]!.toLocaleUpperCase() + s.slice(1) : s);

export function EndedScreen({ nav, active }: ScreenProps) {
  const snap = useSnapshot();
  const fresh = useCoreView(endSummary);
  // Уходящий экран (переход в хаб, новая жизнь) держит последнюю запись до конца перехода.
  const [kept, setKept] = useState<{ vm: EndSummaryVM; last: JournalEntryVM[] } | null>(null);
  if (fresh && fresh !== kept?.vm) setKept({ vm: fresh, last: snap.journal.filter(e => e.age === fresh.age) });
  const data = fresh ? { vm: fresh, last: snap.journal.filter(e => e.age === fresh.age) } : kept;
  const reduced = useReducedMotion();
  const [appeared, setAppeared] = useState(false);
  useEffect(() => {
    if (reduced) return;
    const id = setTimeout(() => setAppeared(true), SHOW_MS);
    return () => clearTimeout(id);
  }, [reduced]);
  const shown = reduced || appeared;

  const toHub = () => { if (active) nav.go({ id: 'hub' }); };

  return (
    <main className={`screen en${reduced ? ' en--still' : ''}`} data-shown={shown || undefined}>
      <div className="en__glow" aria-hidden="true" />
      <div className="en__scroll scroll">
        {data ? <Summary vm={data.vm} last={data.last} reduced={reduced} /> : <p className="en__missing">{t('ended.missing')}</p>}
      </div>
      <footer className="en__foot">
        <button type="button" className="en-hub" onClick={toHub} disabled={!active}>
          <HubIcon />
          <span className="k-o en-hub__label">{t('ended.toHub')}</span>
        </button>
      </footer>
    </main>
  );
}

function Summary({ vm, last, reduced }: { vm: EndSummaryVM; last: JournalEntryVM[]; reduced: boolean }) {
  const pub = vm.pub;
  const chaptersId = useId();
  const living = vm.people.filter(p => !p.gone);
  const blocks: { key: BlockKey; title: string; hint: string; body: ReactNode }[] = [
    {
      key: 'end',
      title: t(`ended.block.end.${pub}`),
      hint: [vm.ending.quiet ? '' : capFirst(vm.ending.cause), vm.diedYear != null ? String(vm.diedYear) : ''].filter(Boolean).join(' · '),
      body: <EndingBody vm={vm} />,
    },
    {
      key: 'last',
      title: t(`ended.block.last.${pub}`),
      hint: STATS.map(k => `${t(`stat.${k}`)} ${vm.stats[k]}`).join(' · '),
      body: <LastYearBody vm={vm} last={last} />,
    },
  ];
  if (vm.people.length || vm.familyNotes.length) {
    blocks.push({ key: 'people', title: t('ended.block.people'), hint: living.map(p => p.name).join(', '), body: <PeopleBody vm={vm} /> });
  }
  if (vm.money) {
    const m = vm.money;
    blocks.push({
      key: 'money',
      title: t(`ended.block.money.${pub}`),
      hint: [m.total?.value ?? '', m.rows.map(r => r.label).join(', '), m.noDebt ? t('ended.noDebtsHint') : ''].filter(Boolean).join(' · '),
      body: <MoneyBody money={m} />,
    });
  }

  return (
    <>
      <header className="en-top">
        <div className="en-photo" aria-hidden="true">
          <span className="en-photo__pic">
            <PersonPortrait look={vm.look} fallback={<span className="k-o en-photo__letter">{initialOf(vm.given || vm.name)}</span>} />
          </span>
          <span className="en-photo__cap">{t('ended.photo', { name: vm.given || vm.name, age: vm.age })}</span>
        </div>
        <svg className="en-ribbon" width="230" height="46" viewBox="0 0 230 46" role="img" aria-label={t('ended.ribbon')}>
          <path d="M4 14 H30 V40 H4 L13 27 Z M226 14 H200 V40 H226 L217 27 Z" fill="#2593a3" stroke="#7b4b2a" strokeWidth="2.5" strokeLinejoin="round" />
          <rect x="22" y="4" width="186" height="34" rx="7" fill="#3ec3d2" stroke="#7b4b2a" strokeWidth="2.5" />
          <rect x="29" y="9" width="172" height="6" rx="3" fill="#ffffff" opacity="0.35" />
          <text x="115" y="29" textAnchor="middle" fontFamily="Fredoka, sans-serif" fontSize="20" fontWeight="700" fill="#ffffff" stroke="#5a3418" strokeWidth="3.4" paintOrder="stroke" strokeLinejoin="round">{t('ended.ribbon')}</text>
        </svg>
      </header>
      <h1 className="k-o en-name">{vm.name}</h1>
      {vm.bornYear != null && vm.diedYear != null && (
        <p className="en-years">{t('ended.yearsPlace', { from: vm.bornYear, to: vm.diedYear, place: vm.bornPlace })}</p>
      )}
      {vm.story && <Story text={vm.story} />}
      <AgeCard vm={vm} reduced={reduced} />

      {vm.chapters.length > 0 && (
        <section className="en-chapters" aria-labelledby={chaptersId}>
          <h2 className="en-chapters__head" id={chaptersId}>
            <span className="sr-only">{t(`ended.chaptersOf.${pub}`)}</span>
            <span aria-hidden="true">{t('ended.chapters')}</span>
          </h2>
          <ol className="en-chapters__list">
            {vm.chapters.map((c, i) => (
              <li key={`${c.i}-${i}`} className="en-ch" data-death={c.death || undefined} style={{ ['--d' as string]: `${(0.6 + i * 0.12).toFixed(2)}s` }}>
                <span className="sr-only">{c.year != null ? t('ended.chapterSr', { age: c.age, year: c.year }) : t('ended.chapterSrNoYear', { age: c.age })}</span>
                <span className="en-ch__year tabular" aria-hidden="true">{c.year ?? ''}</span>
                <span className="en-ch__age tabular" aria-hidden="true">{c.age}</span>
                <span className="en-ch__text">{c.text}</span>
                {c.who && (
                  <span className="en-ch__who" aria-hidden="true">
                    <PersonPortrait look={c.who.look} fallback={<span className="en-ch__letter">{initialOf(c.who.name)}</span>} />
                  </span>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {blocks.map(b => <Block key={b.key} k={b.key} title={b.title} hint={b.hint} reduced={reduced}>{b.body}</Block>)}

      {vm.saved && (
        <p className="en-saved">
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="3" width="15" height="18.5" rx="2.5" fill="#b48cff" stroke="#5a3418" strokeWidth="1.8" /><path d="M8 3.5v17.5" stroke="#5a3418" strokeWidth="1.6" /><path d="M14 9.4c.9-1.6 3.5-1.2 3.5.8 0 1.6-2 2.8-3.5 4-1.5-1.2-3.5-2.4-3.5-4 0-2 2.6-2.4 3.5-.8Z" fill="#ffffff" stroke="#5a3418" strokeWidth="1.3" strokeLinejoin="round" /></svg>
          {t('ended.saved')}
        </p>
      )}
    </>
  );
}

/** История жизни: четыре строки, остальное — по кнопке (если не поместилась). */
function Story({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement | null>(null);
  const [open, setOpen] = useState(false);
  const [over, setOver] = useState(false);
  const id = useId();
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || open) return;
    const check = () => setOver(el.scrollHeight > el.clientHeight + 1);
    check();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, open]);
  return (
    <div className="en-story">
      <p ref={ref} id={id} className="en-story__text" data-open={open || undefined}>{text}</p>
      {(over || open) && (
        <button type="button" className="en-story__more" aria-expanded={open} aria-controls={id} onClick={() => setOpen(o => !o)}>
          {open ? t('ended.storyLess') : t('ended.storyMore')}
        </button>
      )}
    </div>
  );
}

/** Возраст смерти на шкале до 100 и отметка ожидаемой продолжительности; полоса растёт 400 + 1200 мс. */
function AgeCard({ vm, reduced }: { vm: EndSummaryVM; reduced: boolean }) {
  const [p, setP] = useState(0);
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const t0 = performance.now();
    const frame = (now: number) => {
      const x = Math.min(1, Math.max(0, (now - t0 - COUNT_AT) / COUNT_MS));
      setP(x);
      if (x < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);
  const k = reduced ? 1 : easeOutCubic(p);
  const fill = Math.min(100, vm.age) * k;
  const mark = Math.max(0, Math.min(100, vm.lifeExpectancy));
  const title = t('ended.livedTo', { age: vm.age });
  return (
    <section className="en-age" aria-label={title}>
      <p className="en-age__title">{title}</p>
      <div className="en-age__bar" aria-hidden="true">
        <div className="en-age__fill" style={{ width: `${fill}%` }} />
        <span className="en-age__mark" style={{ left: `${mark}%` }} />
        <svg className="en-age__knob" width="24" height="24" viewBox="0 0 24 24" style={{ left: `${fill}%` }}>
          <circle cx="12" cy="12" r="11" fill="#ffffff" stroke="#7b4b2a" strokeWidth="2" />
          <text x="12" y="16.1" textAnchor="middle" fontFamily="Fredoka, sans-serif" fontSize={vm.age >= 100 ? 9.5 : 11.5} fontWeight="700" fill="#5a3418">{Math.round(vm.age * k)}</text>
        </svg>
      </div>
      {vm.cohort && <p className="en-age__note">{vm.cohort}</p>}
      <p className="en-age__note en-age__note--mark">{t('ended.markNote')}</p>
    </section>
  );
}

/** Раскрываемый блок: содержимое строится при раскрытии, фигурки и полосы дорисовываются через 60 мс. */
function Block({ k, title, hint, reduced, children }: { k: BlockKey; title: string; hint: string; reduced: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [filled, setFilled] = useState(false);
  const panelId = useId();
  useEffect(() => {
    if (!open) { setFilled(false); return; }
    if (reduced) { setFilled(true); return; }
    const id = setTimeout(() => setFilled(true), FILL_MS);
    return () => clearTimeout(id);
  }, [open, reduced]);
  return (
    <section className="en-block" data-filled={filled || undefined}>
      <h2 className="en-block__h">
        <button type="button" className="en-block__btn" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(o => !o)}>
          <span className="en-block__icon" style={{ background: TINT[k] }} aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24"><path d={ICON[k]} fill="#ffffff" stroke="#5a3418" strokeWidth="1.9" strokeLinejoin="round" /></svg>
          </span>
          <span className="en-block__text">
            <span className="en-block__title">{title}</span>
            {hint && <span className="en-block__hint">{hint}</span>}
          </span>
          <svg className="en-block__chev" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="#7b4b2a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </h2>
      <div id={panelId} className="en-block__panel">{open && children}</div>
    </section>
  );
}

function EndingBody({ vm }: { vm: EndSummaryVM }) {
  const e = vm.ending;
  const share = e.share;
  return (
    <div className="en-body">
      <p className="en-body__cause" data-quiet={e.quiet || undefined}>{e.causeLabel || t('ended.cause')} <b>{e.cause}</b></p>
      {e.lines.map((line, i) => <p key={i} className="en-body__p">{line}</p>)}
      {e.help.length > 0 && <div className="en-help" role="note">{e.help.map((line, i) => <p key={i}>{line}</p>)}</div>}
      {share && (
        <>
          <h3 className="en-body__sub">{t('ended.common')}</h3>
          <p className="en-body__small">{share.text} {t('ended.shareNote')}</p>
          {share.of20 > 0 && (
            <div className="en-figs" role="img" aria-label={share.of20 === 1 ? t('ended.figuresOne', { country: share.country, band: share.band }) : t('ended.figures', { country: share.country, band: share.band, n: share.of20 })}>
              {Array.from({ length: FIGURES }, (_, i) => (
                <svg key={i} className="en-fig" data-struck={i < share.of20 || undefined} viewBox="0 0 24 26" aria-hidden="true" style={{ ['--d' as string]: `${(0.1 + i * 0.12).toFixed(2)}s` }}>
                  <circle cx="12" cy="7" r="5" stroke="#7b4b2a" strokeWidth="1.6" />
                  <path d="M3.5 25c0-5.6 3.8-9.2 8.5-9.2s8.5 3.6 8.5 9.2Z" stroke="#7b4b2a" strokeWidth="1.6" strokeLinejoin="round" />
                </svg>
              ))}
            </div>
          )}
        </>
      )}
      {e.epitaph.length > 0 && (
        <div className="en-epitaph">
          <h3 className="en-body__sub">{t('ended.epitaph')}</h3>
          {e.epitaph.map((line, i) => <p key={i}>{line}</p>)}
        </div>
      )}
    </div>
  );
}

function LastYearBody({ vm, last }: { vm: EndSummaryVM; last: JournalEntryVM[] }) {
  return (
    <div className="en-body">
      <div className="en-stats">
        {STATS.map(k => (
          <div key={k} className="meter" role="meter" aria-label={t(`stat.${k}`)} aria-valuemin={0} aria-valuemax={100} aria-valuenow={vm.stats[k]}>
            <p className="meter__label">{t(`stat.${k}`)}</p>
            <div className="meter__bar en-stats__bar">
              <div className="meter__fill en-stats__fill" style={{ ['--w' as string]: `${Math.max(0, Math.min(100, vm.stats[k]))}%`, background: STAT_COLOR[k] }} />
              <span className="meter__over"><StatIcon k={k} /><span className="k-os tabular meter__num">{vm.stats[k]}</span></span>
            </div>
          </div>
        ))}
      </div>
      <p className="en-body__small">{t(`ended.lastNote.${vm.pub}`)}</p>
      {last.length > 0 && (
        <>
          <h3 className="en-body__sub">{vm.lastYearHead || t('ended.lastLog')}</h3>
          <ul className="en-log">
            {last.map(e => <li key={e.i} data-death={e.kind === 'death' || undefined}>{e.text}</li>)}
          </ul>
        </>
      )}
    </div>
  );
}

function personNote(p: EndPersonVM): string {
  return [p.friend ? t('ended.friend') : p.role, p.age != null ? t('ended.ageOf', { age: p.age }) : '', ...p.details].filter(Boolean).join(' · ');
}

function PersonRow({ p, bg }: { p: EndPersonVM; bg: string }) {
  const note = personNote(p);
  return (
    <li className="en-person" data-gone={p.gone || undefined}>
      <span className="en-person__face" style={{ background: bg }} aria-hidden="true">
        <PersonPortrait look={p.look} fallback={<span className="k-os en-person__letter">{initialOf(p.name)}</span>} />
      </span>
      <span className="en-person__text">
        <span className="en-person__name">{p.name}</span>
        {note && <span className="en-person__note">{note}</span>}
      </span>
    </li>
  );
}

function PeopleBody({ vm }: { vm: EndSummaryVM }) {
  const living = vm.people.filter(p => !p.gone);
  const gone = vm.people.filter(p => p.gone);
  return (
    <div className="en-body en-body--people">
      {vm.peopleNote && <p className="en-body__small en-body__lead">{vm.peopleNote}</p>}
      {living.length > 0 && <ul className="en-people">{living.map((p, i) => <PersonRow key={p.id} p={p} bg={PERSON_BG[i % PERSON_BG.length]!} />)}</ul>}
      {vm.familyNotes.length > 0 && (
        <dl className="en-notes">
          {vm.familyNotes.map((n, i) => <div key={i} className="en-notes__row"><dt>{n.label}</dt><dd>{n.value}</dd></div>)}
        </dl>
      )}
      {gone.length > 0 && (
        <>
          <h3 className="en-body__sub">{t('ended.inMemory')}</h3>
          <ul className="en-people">{gone.map((p, i) => <PersonRow key={p.id} p={p} bg={PERSON_BG[(i + living.length) % PERSON_BG.length]!} />)}</ul>
        </>
      )}
    </div>
  );
}

function MoneyBody({ money }: { money: NonNullable<EndSummaryVM['money']> }) {
  return (
    <div className="en-body en-body--money">
      <dl className="en-money">
        {money.rows.map((r, i) => (
          <div key={i} className="en-money__row"><dt>{r.label}</dt><dd data-debt={r.debt || undefined}>{r.value}</dd></div>
        ))}
        {money.noDebt && <div className="en-money__row"><dt>{t('ended.debts')}</dt><dd>{t('ended.noDebts')}</dd></div>}
        {money.total && (
          <div className="en-money__row en-money__row--total">
            <dt>{money.total.label}{money.total.rank && <small>{money.total.rank}</small>}</dt>
            <dd>{money.total.value}</dd>
          </div>
        )}
      </dl>
      {money.estate && (
        <div className="en-estate">
          {money.estate.title && <h3 className="en-body__sub">{money.estate.title}</h3>}
          {money.estate.how && <p className="en-body__small">{money.estate.how}</p>}
          {money.estate.heirs.length > 0 && (
            <dl className="en-money">
              {money.estate.heirs.map((h, i) => <div key={i} className="en-money__row"><dt>{h.name}</dt><dd>{h.value}</dd></div>)}
            </dl>
          )}
        </div>
      )}
    </div>
  );
}

function HubIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" className="en-hub__icon">
      <path d="M3.5 11.5 12 4.5l8.5 7" fill="none" stroke="#7b4b2a" strokeWidth="5.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10v10h12V10" fill="#ffffff" stroke="#7b4b2a" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M3.5 11.5 12 4.5l8.5 7" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 20v-5h4v5" fill="#ffd75a" stroke="#7b4b2a" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
