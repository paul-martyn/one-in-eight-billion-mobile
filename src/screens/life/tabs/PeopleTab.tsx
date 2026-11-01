// Вкладка People (PeopleCute.dc.html + PeopleCutePerson.dc.html).
// Данные — builder src/adapters/vm/people.ts (семья, друзья, питомцы и умершие
// из S.fam/S.flags через функции оригинала) и дневник из снимка адаптера.
// Действий с ценами из макета («Buy him a gift»…) в оригинале нет — вместо них
// честная пометка: отношения меняются через решения и фокус жизни.
import { useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { t } from '../../../i18n';
import { useCoreView, useSnapshot } from '../../../adapters/useGame';
import { peopleVM, type MemoryVM, type PeopleVM, type PersonVM, type BondTone } from '../../../adapters/vm/people';
import { ChevronIcon } from '../../../ui/icons';
import { Eyebrow } from '../../../ui/components';
import { TabHeader, TabNavSpace, TabScroll, pausedText } from './peopleParts/TabFrame';
import { Avatar, BondChip } from './peopleParts/personParts';
import { findMentions } from '../../../ui/people/mentions';
import type { TabProps } from './types';
import './people.css';

type Filter = 'all' | 'family' | 'friends' | 'pets';
const FILTERS: Filter[] = ['all', 'family', 'friends', 'pets'];
// Выбранный фильтр переживает переключение вкладок (только представление).
let savedFilter: Filter = 'all';

/** Человек или запись «In memory» в виде, общем для списка и карточки. */
type Entry = {
  id: string;
  title: string;
  role: string;
  hasName: boolean;
  age: number | null;
  bond: string;
  tone: BondTone;
  tags: string[];
  names: string[];
  phrases: string[];
  memory: boolean;
  away: boolean;
  pet: boolean;
  friend: boolean;
};

function fromPerson(p: PersonVM): Entry {
  const role = p.group === 'friends' ? t('people.role.friend') : p.role;
  const tags = [p.job, ...p.notes].filter(Boolean);
  if (p.pet && p.away) tags.push(t('people.petAway'));
  return {
    id: p.id, title: p.name || role, role, hasName: !!p.name, age: p.age, bond: p.bond, tone: p.tone, tags,
    names: p.search, phrases: [...p.phrases, ...(p.kin && role && !p.phrases.length ? [t('people.yourRole', { role: role.toLocaleLowerCase() })] : [])],
    memory: false, away: p.away, pet: p.pet, friend: p.group === 'friends',
  };
}

function fromMemory(m: MemoryVM): Entry {
  const died = m.line && m.year != null ? t('people.diedYear', { line: m.line, year: m.year }) : m.line;
  return {
    id: `mem:${m.id}`, title: m.name || m.role, role: m.role, hasName: !!m.name, age: null, bond: '', tone: 'none',
    tags: [died, m.job].filter(Boolean),
    names: m.search, phrases: [...m.phrases, ...(m.kin && m.role && !m.phrases.length ? [t('people.yourRole', { role: m.role.toLocaleLowerCase() })] : [])],
    memory: true, away: false, pet: false, friend: false,
  };
}

const subLine = (e: Entry) => (e.hasName ? (e.age != null ? t('people.roleAge', { role: e.role, age: e.age }) : e.role) : e.age != null ? t('life.age', { age: e.age }) : '');

export function PeopleTab({ active }: TabProps) {
  const snap = useSnapshot();
  const vm = useCoreView(peopleVM);
  const [filter, setFilterState] = useState<Filter>(savedFilter);
  const [openId, setOpenId] = useState<string | null>(null);
  const [memOpen, setMemOpen] = useState(false);
  const rootRef = useRef<HTMLElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const backRef = useRef<HTMLButtonElement | null>(null);
  const savedScroll = useRef(0);
  const lastOpened = useRef<string | null>(null);
  const firstLayout = useRef(true);

  const setFilter = (f: Filter) => { savedFilter = f; setFilterState(f); };

  const entries = useMemo(() => {
    const map = new Map<string, Entry>();
    if (vm) {
      for (const p of [...vm.family, ...vm.friends, ...vm.pets]) map.set(p.id, fromPerson(p));
      for (const m of vm.memory) { const e = fromMemory(m); map.set(e.id, e); }
    }
    return map;
  }, [vm]);
  const open = openId ? entries.get(openId) ?? null : null;

  const openEntry = (id: string) => {
    savedScroll.current = listRef.current?.scrollTop ?? 0;
    lastOpened.current = id;
    setOpenId(id);
  };
  const closeEntry = () => setOpenId(null);

  // Фокус и прокрутка при смене вида: карточка → кнопка «назад», список → открытый ранее человек.
  useLayoutEffect(() => {
    if (firstLayout.current) { firstLayout.current = false; return; }
    if (open) { backRef.current?.focus({ preventScroll: true }); return; }
    if (listRef.current) listRef.current.scrollTop = savedScroll.current;
    const id = lastOpened.current;
    if (id) rootRef.current?.querySelector<HTMLElement>(`[data-pid="${CSS.escape(id)}"]`)?.focus({ preventScroll: true });
  }, [open ? open.id : null]); // eslint-disable-line react-hooks/exhaustive-deps

  const age = snap.life?.age ?? vm?.age ?? null;
  const year = snap.life?.year ?? vm?.year ?? null;
  const status = pausedText('people', age, year);

  return (
    <section ref={rootRef} className="screen tabf ppl" aria-label={t('tab.people')} inert={!active}>
      {open ? (
        <PersonView entry={open} vm={vm} status={status} backRef={backRef} onBack={closeEntry} journal={snap.journal} />
      ) : (
        <ListView vm={vm} status={status} filter={filter} setFilter={setFilter} memOpen={memOpen} setMemOpen={setMemOpen} entries={entries} listRef={listRef} onOpen={openEntry} />
      )}
      <TabNavSpace />
    </section>
  );
}

function ListView({ vm, status, filter, setFilter, memOpen, setMemOpen, entries, listRef, onOpen }: {
  vm: PeopleVM | null; status: string | null; filter: Filter; setFilter(f: Filter): void; memOpen: boolean; setMemOpen(v: boolean): void;
  entries: Map<string, Entry>; listRef: RefObject<HTMLDivElement | null>; onOpen(id: string): void;
}) {
  const counts: Record<Filter, number> = {
    family: vm?.family.length ?? 0, friends: vm?.friends.length ?? 0, pets: vm?.pets.length ?? 0, all: 0,
  };
  counts.all = counts.family + counts.friends + counts.pets;
  const show = (g: Exclude<Filter, 'all'>) => filter === 'all' || filter === g;
  const row = (id: string) => {
    const e = entries.get(id);
    return e ? <PersonRow key={id} e={e} onOpen={onOpen} /> : null;
  };
  const famVis = !!vm && show('family') && (vm.family.length > 0 || vm.familyNotes.length > 0);
  const friVis = !!vm && show('friends') && (vm.friends.length > 0 || !!vm.friendsNote || !!vm.friendsBond);
  const petVis = !!vm && show('pets') && vm.pets.length > 0;
  const empty = !!vm && !famVis && !friVis && !petVis;

  return (
    <>
      <TabHeader title={t('tab.people')} status={status}>
        <div className="ppl-filters" role="group" aria-label={t('people.filter.label')}>
          {FILTERS.map(f => (
            <button
              key={f}
              type="button"
              className={`ppl-chip ${filter === f ? 'is-on' : ''}`}
              aria-pressed={filter === f}
              aria-label={t('people.filter.aria', { label: t(`people.filter.${f}`), count: counts[f] })}
              onClick={() => setFilter(f)}
            >
              <span className="ppl-chip__label">{t(`people.filter.${f}`)}</span>
              <span className="ppl-chip__count tabular" aria-hidden="true">{counts[f]}</span>
            </button>
          ))}
        </div>
      </TabHeader>
      <TabScroll ref={listRef}>
        {vm && famVis && (
          <section aria-label={t('people.group.family')}>
            <Eyebrow>{t('people.group.family')}</Eyebrow>
            {vm.family.map(p => row(p.id))}
            {vm.familyNotes.map((n, i) => (
              <p key={i} className="tabf-info ppl-fnote"><span className="ppl-fnote__label">{n.label}</span> {n.value}</p>
            ))}
          </section>
        )}
        {vm && friVis && (
          <section aria-label={t('people.group.friends')}>
            <Eyebrow meta={vm.friendsBond ? <BondChip word={vm.friendsBond} tone={vm.friendsTone} /> : undefined}>{t('people.group.friends')}</Eyebrow>
            {vm.friends.map(p => row(p.id))}
            {vm.friendsNote && <p className="tabf-info">{vm.friendsNote}</p>}
            {!vm.friends.length && !vm.friendsNote && <p className="tabf-info">{t('people.friendsNoNames')}</p>}
          </section>
        )}
        {vm && petVis && (
          <section aria-label={t('people.group.pets')}>
            <Eyebrow>{t('people.group.pets')}</Eyebrow>
            {vm.pets.map(p => row(p.id))}
          </section>
        )}
        {vm && empty && <p className="tabf-note">{filter === 'friends' && !vm.friendsShown ? t('people.friendsYoung') : t('people.empty')}</p>}

        {vm && vm.memory.length > 0 && (
          <section className="ppl-memsec">
            <h2 className="ppl-memhead">
              <button type="button" className="ppl-memtoggle" aria-expanded={memOpen} aria-controls="ppl-memory" onClick={() => setMemOpen(!memOpen)}>
                <span>{t('people.memory', { count: vm.memory.length })}</span>
                <span className="ppl-memtoggle__rule" aria-hidden="true" />
                <span className="ppl-memtoggle__mark" aria-hidden="true">{memOpen ? '−' : '+'}</span>
              </button>
            </h2>
            <div id="ppl-memory" className="ppl-mem" hidden={!memOpen}>
              {vm.memory.map(m => row(`mem:${m.id}`))}
            </div>
          </section>
        )}
      </TabScroll>
    </>
  );
}

function PersonRow({ e, onOpen }: { e: Entry; onOpen(id: string): void }) {
  const sub = subLine(e);
  const line = e.tags.join(' · ');
  return (
    <button type="button" className={`ppl-row ${e.memory ? 'is-memory' : ''} ${e.away ? 'is-away' : ''}`} data-pid={e.id} onClick={() => onOpen(e.id)}>
      <Avatar id={e.id} name={e.hasName ? e.title : ''} size={e.memory ? 46 : 54} memory={e.memory} away={e.away} pet={e.pet} />
      <span className="ppl-row__text">
        <span className="ppl-row__top">
          <span className="ppl-row__name">{e.title}</span>
          {sub && <span className="ppl-row__role">{sub}</span>}
        </span>
        {e.bond && <BondChip word={e.bond} tone={e.tone} />}
        {line && <span className="ppl-row__line">{line}</span>}
      </span>
      <ChevronIcon size={16} className="ppl-row__chev" />
    </button>
  );
}

function PersonView({ entry: e, vm, status, backRef, onBack, journal }: {
  entry: Entry; vm: PeopleVM | null; status: string | null; backRef: RefObject<HTMLButtonElement | null>; onBack(): void;
  journal: ReturnType<typeof useSnapshot>['journal'];
}) {
  const searchable = e.names.length > 0 || e.phrases.length > 0;
  const mentions = useMemo(() => findMentions(journal, e.names, e.phrases), [journal, e.names, e.phrases]);
  const bond = e.friend ? vm?.friendsBond ?? '' : e.bond;
  const tone = e.friend ? vm?.friendsTone ?? 'none' : e.tone;
  const sub = subLine(e);
  const aboutId = `ppl-about-${e.id}`;
  return (
    <>
      <TabHeader title={e.hasName ? e.names[0] ?? e.title : e.title} status={status} back={{ label: t('people.back'), onClick: onBack, buttonRef: backRef }} />
      <TabScroll>
        <section className="tabf-hero ppl-about" aria-labelledby={aboutId}>
          <Avatar id={e.id} name={e.hasName ? e.title : ''} size={88} memory={e.memory} away={e.away} pet={e.pet} />
          <div className="ppl-about__text">
            <h2 id={aboutId} className="ppl-about__name">{e.title}</h2>
            {sub && <p className="ppl-about__role">{sub}</p>}
            {e.tags.length > 0 && (
              <ul className="ppl-tags">
                {e.tags.map((tag, i) => <li key={i} className="ppl-tag">{tag}</li>)}
              </ul>
            )}
          </div>
        </section>

        {bond && (
          <>
            <Eyebrow>{t('people.between')}</Eyebrow>
            <div className="tabf-card ppl-between">
              <BondChip word={bond} tone={tone} big />
              {e.friend && <p className="ppl-between__note">{t('people.friendsTogether')}</p>}
            </div>
          </>
        )}

        {searchable && (
          <>
            <Eyebrow meta={mentions.length > 1 ? t('people.mentionsMeta') : undefined}>{t('people.mentions')}</Eyebrow>
            {mentions.length > 0 ? (
              <ol className="ppl-lately">
                {mentions.map(m => (
                  <li key={m.i} className="ppl-lately__item">
                    <span className="ppl-lately__tag tabular">{m.year != null ? t('people.ageTag', { age: m.age, year: m.year }) : t('people.ageTagNoYear', { age: m.age })}</span>
                    <span className="ppl-lately__text">{m.text}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="tabf-note ppl-none">
                {e.hasName || !e.phrases[0] ? t('people.mentionsNone', { name: e.title }) : t('people.mentionsNonePhrase', { phrase: e.phrases[0] })}
              </p>
            )}
          </>
        )}

        {!e.memory && <p className="tabf-info">{t('people.howNote')}</p>}
        <p className="tabf-note">{t('people.pausedNote')}</p>
      </TabScroll>
    </>
  );
}
