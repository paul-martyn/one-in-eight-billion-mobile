// Вкладка Money (MoneyCute.dc.html). Данные — builder src/adapters/vm/money.ts,
// который повторяет денежный блок оригинала (renderStats): чистые активы,
// доход, итог прошлого года, имущество, долг, доход партнёра, место по доходу.
// Ниже — денежная часть листа «Spend & invest» оригинала (spendView(T, 'money'),
// spendParts/SpendSection): покупки, продажи, переводы, вложения, подарки,
// фамилия детей, страховка и денежные автопривычки. Вклада с процентами и окна
// «Savings» макета в оригинале нет — они не показываются.
import type { ReactNode } from 'react';
import { t } from '../../../i18n';
import { useCoreView, useSnapshot } from '../../../adapters/useGame';
import { moneyVM, type MoneyVM } from '../../../adapters/vm/money';
import { ChevronIcon } from '../../../ui/icons';
import { Eyebrow } from '../../../ui/components';
import { TabHeader, TabNavSpace, TabScroll, pausedText } from './peopleParts/TabFrame';
import { CountUp } from './moneyParts/CountUp';
import { SpendSection } from './spendParts/SpendSection';
import { moneySpend } from './spendParts/spendData';
import type { TabProps } from './types';
import './money.css';

const Banknote = () => (
  <svg width="27" height="20" viewBox="0 0 32 24" aria-hidden="true" className="mny-note">
    <rect x="2" y="3" width="28" height="18" rx="4" fill="#8fd14f" stroke="#7b4b2a" strokeWidth="2.4" />
    <circle cx="16" cy="12" r="4.5" fill="#c9f09a" stroke="#7b4b2a" strokeWidth="2.2" />
  </svg>
);

function Row({ label, sub, value, tone, children }: { label: string; sub?: string; value?: string; tone?: 'up' | 'down' | 'muted'; children?: ReactNode }) {
  return (
    <div className="mny-row">
      <span className="mny-row__text">
        <span className="mny-row__label">{label}</span>
        {sub && <span className="mny-row__sub">{sub}</span>}
      </span>
      {children}
      {value && <span className={`mny-row__value tabular ${tone ? `is-${tone}` : ''}`}>{value}</span>}
    </div>
  );
}

export function MoneyTab({ active, openTab }: TabProps) {
  const snap = useSnapshot();
  const vm = useCoreView(moneyVM);
  const spend = useCoreView(moneySpend);
  const age = snap.life?.age ?? vm?.age ?? null;
  const year = snap.life?.year ?? vm?.year ?? null;

  return (
    <section className="screen tabf mny" aria-label={t('tab.money')} inert={!active}>
      <TabHeader title={t('tab.money')} status={pausedText('money', age, year)} />
      <TabScroll>
        {vm && (
          <MoneyBody vm={vm} play={active} onWork={() => openTab('activities')}>
            <SpendSection tab="money" data={spend} title={spend?.view.title ?? ''} active={active} />
          </MoneyBody>
        )}
      </TabScroll>
      <TabNavSpace />
    </section>
  );
}

function MoneyBody({ vm, play, onWork, children }: { vm: MoneyVM; play: boolean; onWork(): void; children?: ReactNode }) {
  const flowUp = vm.pastYear?.items.filter(i => i.up) ?? [];
  const flowDown = vm.pastYear?.items.filter(i => !i.up) ?? [];
  const hasWork = !!(vm.job || vm.partner || vm.rank || vm.way);
  return (
    <>
      <section className="tabf-hero mny-hero" aria-label={t('money.hero')}>
        <p className="mny-hero__label">{t('money.netWorth')}</p>
        <p className="mny-hero__big tabular">
          <Banknote />
          {vm.netWorth ? <span className="mny-hero__num"><CountUp text={vm.netWorth} play={play} /></span> : <span className="mny-hero__num is-none">—</span>}
        </p>
        {vm.netWorthNote && <p className="mny-hero__note">{vm.netWorthNote}</p>}
        {vm.excludingHome && <p className="mny-hero__note">{vm.excludingHome}</p>}
        <div className={`mny-tiles ${vm.pastYear ? '' : 'is-single'}`}>
          <div className="mny-tile">
            <span className="mny-tile__label">{t('money.income')}</span>
            <span className="mny-tile__value tabular">{vm.income ? <CountUp text={vm.income} play={play} /> : '—'}</span>
            {vm.incomeNote && <span className="mny-tile__sub">{vm.incomeNote}</span>}
          </div>
          {vm.pastYear && (
            <div className="mny-tile">
              <span className="mny-tile__label">{t('money.pastYear')}</span>
              <span className={`mny-tile__value tabular ${vm.pastYear.up ? 'is-up' : 'is-down'}`}><CountUp text={vm.pastYear.delta} play={play} /></span>
              <span className="mny-tile__sub">{t('money.pastYearSub')}</span>
            </div>
          )}
        </div>
      </section>

      {!vm.adult && <p className="tabf-info">{t('money.young')}</p>}

      {vm.pastYear && (
        <section aria-label={t('money.flow.title')}>
          <Eyebrow meta={vm.pastYear.delta}>{t('money.flow.title')}</Eyebrow>
          <div className="tabf-card">
            {flowUp.length > 0 && <p className="mny-sub">{t('money.flow.up')}</p>}
            {flowUp.map((it, i) => <Row key={`u${i}`} label={it.label} value={it.amount} tone="up" />)}
            {flowDown.length > 0 && <p className="mny-sub">{t('money.flow.down')}</p>}
            {flowDown.map((it, i) => <Row key={`d${i}`} label={it.label} value={it.amount} tone="down" />)}
          </div>
        </section>
      )}

      {hasWork && (
        <section aria-label={t('money.work.title')}>
          <Eyebrow>{t('money.work.title')}</Eyebrow>
          <div className="tabf-card">
            {vm.job && (
              <Row label={vm.job}>
                <button type="button" className="tabf-link" aria-label={t('money.work.linkLabel')} onClick={onWork}>
                  {t('money.work.link')}<ChevronIcon size={12} />
                </button>
              </Row>
            )}
            {vm.partner && <Row label={t(`money.partner.${vm.partner.kind}`)} sub={vm.partner.note} value={vm.partner.amount} />}
            {vm.rank && (
              <div className="mny-rank">
                <p className="mny-sub">{t(`money.rank.${vm.rank.whose}`)}</p>
                <div className="mny-rank__grid">
                  <div className="mny-rank__cell">
                    <span className="mny-rank__label">{t('money.rank.local', { country: vm.rank.country })}</span>
                    <span className="mny-rank__value tabular">{vm.rank.local}</span>
                  </div>
                  <div className="mny-rank__cell">
                    <span className="mny-rank__label">{t('money.rank.world')}</span>
                    <span className="mny-rank__value tabular">{vm.rank.world}</span>
                  </div>
                </div>
              </div>
            )}
            {vm.way && <Row label={t('money.way')} sub={vm.way} />}
          </div>
        </section>
      )}

      {vm.adult && (
        <section aria-label={t('money.own.title')}>
          <Eyebrow>{t('money.own.title')}</Eyebrow>
          <div className="tabf-card">
            {vm.belongings.length ? vm.belongings.map((b, i) => <Row key={i} label={b} />) : <p className="mny-empty">{t('money.own.none')}</p>}
            {vm.invest && <Row label={t('money.invest')} sub={vm.invest} />}
          </div>
        </section>
      )}

      {vm.debt && (
        <section aria-label={t('money.debt.title')}>
          <Eyebrow>{t('money.debt.title')}</Eyebrow>
          <div className="tabf-card">
            <Row label={t('money.debt.label')} sub={vm.debt.detail || undefined} value={vm.debt.amount} tone="down" />
          </div>
        </section>
      )}

      {children}

      <p className="tabf-note">{t('money.pausedNote')}</p>
    </>
  );
}
