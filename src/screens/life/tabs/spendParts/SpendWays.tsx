// «Ways of living» листа оригинала: настройки (сегментированные чипы, выбранный —
// #8fd9e6 по макету) и «On its own» — автопривычки переключателями макета Money.
// Значения, подписи, пояснения и доступность — из SpendView (оригинал).
import { useId } from 'react';
import type { SpendHabit, SpendSetting } from '../../../../adapters/vm/spend';

/** Подпись варианта «Bonds · about 2% on average…»: до первой « · » — название, дальше — пояснение. */
function splitLabel(label: string): { head: string; rest: string } {
  const i = label.indexOf(' · ');
  return i > 0 ? { head: label.slice(0, i), rest: label.slice(i + 3) } : { head: label, rest: '' };
}

export function SettingBlock({ s, disabled, onSet }: { s: SpendSetting; disabled: boolean; onSet(s: SpendSetting, value: string): void }) {
  const id = useId();
  const stack = s.options.length > 3 || s.options.some(o => o.label.length > 28);
  return (
    <div className="spd-set">
      <p className="spd-label" id={id}>{s.title}</p>
      <div
        className={`spd-seg ${stack ? 'is-stack' : ''}`}
        role="group"
        aria-labelledby={id}
        style={stack ? undefined : { gridTemplateColumns: `repeat(${Math.max(1, s.options.length)}, minmax(0, 1fr))` }}
      >
        {s.options.map(o => {
          const { head, rest } = splitLabel(o.label);
          return (
            <button key={o.value} type="button" className="spd-seg__btn" aria-pressed={o.value === s.value} disabled={disabled || !!s.disabled} onClick={() => onSet(s, o.value)}>
              <span className="spd-seg__name">{head}</span>
              {rest && <span className="spd-seg__sub">{rest}</span>}
            </button>
          );
        })}
      </div>
      {s.note && <p className="spd-note">{s.note}</p>}
    </div>
  );
}

export function HabitList({ title, note, habits, disabled, onToggle }: { title: string; note: string; habits: SpendHabit[]; disabled: boolean; onToggle(id: string): void }) {
  const id = useId();
  return (
    <div className="spd-set">
      <p className="spd-label" id={id}>{title}</p>
      <div className="spd-habits" role="group" aria-labelledby={id}>
        {habits.map(h => (
          <button key={h.id} type="button" role="switch" aria-checked={h.on} className="spd-habit" disabled={disabled} onClick={() => onToggle(h.id)}>
            <span className="spd-habit__text">
              <span className="spd-habit__name">{h.name}</span>
              {h.note && <span className="spd-habit__note">{h.note}</span>}
            </span>
            <span className="spd-switch" aria-hidden="true"><span className="spd-switch__knob" /></span>
          </button>
        ))}
      </div>
      {note && <p className="spd-note">{note}</p>}
    </div>
  );
}
