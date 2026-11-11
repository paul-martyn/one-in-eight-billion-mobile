// Окна раздела «Spend & invest» на общем Popup:
// - подтверждение рискованного действия (список SHOP_ASK оригинала) — название,
//   цена и текст оригинала («Tap again to buy»), кнопки Cancel / Confirm;
// - результат покупки (snapshot.lastSpend) — строки журнала с изменениями показателей.
// Окна рисуются порталом в слой экрана жизни, чтобы затемнение закрывало и стикер-меню.
import { useCallback, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { JournalEntryVM } from '../../../../adapters/viewModels';
import { Popup } from '../../../../ui/components';
import { t } from '../../../../i18n';
import { fxColor, fxText } from '../../parts/lifeHooks';
import { Cost, type CostLabels, type SpendPick } from './SpendItemCard';
import { ConfirmMedallion, DoneMedallion } from './spendIcons';

/**
 * Слой экрана жизни (main.lf), в котором окно закрывает всю вкладку и стикер-меню
 * (сама вкладка лежит под меню). Возвращает ref для элемента раздела и найденный слой.
 */
export function useDialogLayer(): [(el: HTMLElement | null) => void, HTMLElement | null] {
  const [layer, setLayer] = useState<HTMLElement | null>(null);
  const anchor = useCallback((el: HTMLElement | null) => {
    if (el) setLayer(el.closest<HTMLElement>('main.lf') ?? el.closest<HTMLElement>('.mobile-viewport'));
  }, []);
  return [anchor, layer];
}

// Escape закрывает окно через общий «Назад» в Popup (onClose).
function Layer({ layer, children }: { layer: HTMLElement | null; children: ReactNode }) {
  if (!layer) return null;
  return createPortal(<div className="spd-layer">{children}</div>, layer);
}

/** Последнее непустое значение: содержимое окна не пропадает, пока оно закрывается. */
function useLast<T>(value: T | null): T | null {
  const [last, setLast] = useState<T | null>(value);
  if (value !== null && value !== last) setLast(value);
  return value ?? last;
}

export function ConfirmDialog({ layer, ask, labels, onCancel, onConfirm }: {
  layer: HTMLElement | null; ask: SpendPick | null; labels: CostLabels; onCancel(): void; onConfirm(): void;
}) {
  const pick = useLast(ask);
  return (
    <Layer layer={layer}>
      <Popup open={!!ask} title={t('spend.confirm.title')} medallion={<ConfirmMedallion />} medallionBg="#d6f0de" onClose={onCancel} closeLabel={t('spend.confirm.cancel')}>
        {pick && (
          <div className="spd-pop">
            <div className="spd-pop__box">
              <p className="spd-pop__name">{pick.itemName}</p>
              {pick.optionName && <p className="spd-pop__opt">{pick.optionName}</p>}
              <p className="spd-pop__chips"><Cost price={pick.price} credit={pick.credit} labels={labels} /></p>
            </div>
            {pick.confirm && <p className="spd-pop__ask" role="note">{pick.confirm}</p>}
            <div className="spd-pop__actions">
              <button type="button" className="spd-btn" onClick={onCancel}>{t('spend.confirm.cancel')}</button>
              <button type="button" className="spd-btn spd-btn--go" onClick={onConfirm}><span className="k-os">{t('spend.confirm.yes')}</span></button>
            </div>
          </div>
        )}
      </Popup>
    </Layer>
  );
}

export type SpendResult = { what: string | null; entries: JournalEntryVM[] };

export function ResultDialog({ layer, result, onDone }: { layer: HTMLElement | null; result: SpendResult | null; onDone(): void }) {
  const shown = useLast(result);
  const what = shown?.what ?? null;
  const entries = shown?.entries ?? [];
  return (
    <Layer layer={layer}>
      <Popup open={!!result} title={t('spend.result.title')} medallion={<DoneMedallion />} medallionBg="#dff4f7" onClose={onDone} closeLabel={t('spend.result.close')}>
        <div className="spd-pop">
          {what && <p className="spd-pop__name spd-pop__name--top">{what}</p>}
          <div className="spd-pop__list" aria-live="polite">
            {entries.map(e => (
              <div key={e.i} className="spd-pop__box spd-entry">
                <p className="spd-entry__text">{e.text}</p>
                {e.fact && <p className="spd-entry__fact">{e.fact}</p>}
                {e.fx.length > 0 && (
                  <ul className="spd-fx">
                    {e.fx.map(f => (
                      <li key={f.k} className="spd-fx__chip"><span className="spd-fx__dot" style={{ background: fxColor(f.k) }} aria-hidden="true" />{fxText(f.k, f.d)}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
          <div className="spd-pop__actions">
            <button type="button" className="spd-btn spd-btn--ok" onClick={onDone}><span className="k-os">{t('spend.result.ok')}</span></button>
          </div>
        </div>
      </Popup>
    </Layer>
  );
}
