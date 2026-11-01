// Окно решения (LiveCuteDecision.dc.html). Вопрос → выбор → ответ с
// записями, которые добавил core, → Continue. Выбор применяется сразу
// командой adapter.choose; окно ответа только показывает результат.
// Защита от случайного нажатия: 700 мс после появления вопроса (DEC_ARM_MS, 203091).
import { useId, useState, type KeyboardEvent } from 'react';
import { t } from '../../../i18n';
import { gestureId, useAdapter, useCoreView } from '../../../adapters/useGame';
import type { Snapshot } from '../../../adapters/gameAdapter';
import type { DecisionVM, LifeVM } from '../../../adapters/viewModels';
import { decisionExtra, type DecisionItem } from '../../../adapters/vm/life';
import { LifeDialog } from './LifeDialog';
import { AskGlyph, PauseGlyph, ReflectGlyph } from './lifeIcons';
import { fxColor, fxText } from './lifeHooks';

const DEC_ARM_MS = 700;

export function DecisionDialog({ open, life, lastChoice, lifeSeq }: {
  open: boolean; life: LifeVM; lastChoice: Snapshot['lastChoice']; lifeSeq: number;
}) {
  const adapter = useAdapter();
  const titleId = useId();
  const pending = life.pending;
  // Счётчик ответов: каждый следующий вопрос получает новый ключ и заново взводит защиту.
  const [answers, setAnswers] = useState(0);
  // Заголовок и вид вопроса, на который ответили (для окна ответа).
  const [asked, setAsked] = useState<{ id: string; title: string; reflect: boolean } | null>(null);

  const answered = !!lastChoice;
  const choose = (k: string, note: string) => {
    if (!pending) return false;
    setAsked({ id: pending.id, title: pending.title, reflect: pending.reflect });
    const ok = adapter.choose(gestureId(), pending.id, k, note);
    setAnswers(n => n + 1);
    return ok;
  };

  const decEntry = lastChoice?.entries.find(e => e.kind === 'dec');
  const answeredTitle = asked && lastChoice && asked.id === lastChoice.decisionId ? asked.title : decEntry?.question || pending?.title || '';
  const reflect = answered ? !!(asked && asked.reflect) : !!pending?.reflect;
  const title = answered ? answeredTitle : pending?.title ?? '';
  const contentKey = answered ? `a${answers}` : `q${lifeSeq}:${pending?.id ?? ''}:${answers}`;

  return (
    <LifeDialog
      open={open}
      variant="decision"
      title={title}
      titleId={titleId}
      contentKey={contentKey}
      medallion={reflect ? <ReflectGlyph /> : <AskGlyph />}
    >
      {answered && lastChoice ? (
        <DecisionAnswer lastChoice={lastChoice} onContinue={() => adapter.dismissLastChoice()} />
      ) : pending ? (
        <DecisionAsk key={contentKey} life={life} pending={pending} onChoose={choose} />
      ) : null}
    </LifeDialog>
  );
}

function DecisionAsk({ life, pending, onChoose }: { life: LifeVM; pending: DecisionVM; onChoose: (k: string, note: string) => boolean }) {
  const extraRaw = useCoreView(decisionExtra);
  const extra = extraRaw && extraRaw.id === pending.id ? extraRaw : null;
  const [shownAt] = useState(() => performance.now());
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const noteId = useId();

  const items: DecisionItem[] = extra?.items ?? pending.choices.map((c, i) => ({ type: 'choice', n: i + 1, k: c.k, label: c.label, sub: c.sub }));
  const hasWrite = pending.choices.some(c => c.k === 'write');
  const withNote = !!pending.input || !!extra?.nameInput;

  const pick = (k: string) => {
    if (busy || performance.now() - shownAt < DEC_ARM_MS) return;
    setBusy(true);
    onChoose(k, withNote ? note : '');
  };
  // Ctrl/Cmd+Enter в поле размышления = «записать» (208521-208529).
  const onNoteKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && hasWrite) { e.preventDefault(); pick('write'); }
  };

  const when = life.year != null ? t('life.ageYear', { age: life.age, year: life.year }) : t('life.age', { age: life.age });
  return (
    <>
      <p className="ld-status">
        <PauseGlyph size={11} />
        <span>{extra?.kind ? t('life.dec.status', { kind: extra.kind, when }) : when}</span>
      </p>
      <div className="ld__scroll scroll">
        {(pending.body || extra?.famLine) && (
          <div className="ld-bubble">
            {pending.body && <p className="ld-bubble__text">{pending.body}</p>}
            {extra?.famLine && <p className="ld-bubble__fam">{extra.famLine}</p>}
          </div>
        )}
        {pending.fact && <p className="ld-fact">{pending.fact}</p>}
        {pending.question && <p className="ld-question" id={`${noteId}-q`}>{pending.question}</p>}
        {pending.input && (
          <textarea
            id={noteId}
            className="ld-note"
            maxLength={200}
            rows={3}
            value={note}
            placeholder={pending.input.placeholder || t('life.dec.notePlaceholder')}
            aria-label={pending.question || t('life.dec.noteLabel')}
            onChange={e => setNote(e.target.value)}
            onKeyDown={onNoteKey}
          />
        )}
        {!pending.input && extra?.nameInput && (
          <label className="ld-name">
            <span className="ld-name__label">{t('life.dec.nameLabel')}</span>
            <input
              className="ld-note ld-note--line"
              maxLength={extra.nameInput.max}
              value={note}
              placeholder={extra.nameInput.placeholder}
              onChange={e => setNote(e.target.value)}
            />
          </label>
        )}
        <div className="ld-options">
          {items.map(it => it.type === 'choice' ? (
            <button key={it.k} type="button" className="ld-opt" disabled={busy} onClick={() => pick(it.k)}>
              <span className="ld-opt__label">{it.label}</span>
              {it.sub && <span className="ld-opt__sub">{it.sub}</span>}
            </button>
          ) : (
            <div key={`g${it.from}`} className="ld-group" role="group" aria-label={it.label || t('life.dec.group')}>
              <p className="ld-opt__label">{it.label}</p>
              {it.sub && <p className="ld-opt__sub">{it.sub}</p>}
              <div className="ld-group__chips">
                {it.chips.map(c => (
                  <button key={c.k} type="button" className="ld-chip" disabled={busy} onClick={() => pick(c.k)}>
                    <span className="ld-chip__label">{c.label}</span>
                    {c.sub && <span className="ld-chip__sub">{c.sub}</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {extra?.locked.map((l, i) => (
            <button key={`l${i}`} type="button" className="ld-opt ld-opt--locked" disabled>
              <span className="ld-opt__label">{l.label}</span>
              <span className="ld-opt__sub">{l.sub || t('life.dec.locked')}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function DecisionAnswer({ lastChoice, onContinue }: { lastChoice: NonNullable<Snapshot['lastChoice']>; onContinue: () => void }) {
  // Строка «Decision: …» повторяет выбор — она уже показана как «You chose».
  const entries = lastChoice.entries.filter(e => e.kind !== 'dec' || e.fx.length > 0);
  return (
    <>
      <p className="ld-status ld-status--chose">{t('decision.youChose', { label: lastChoice.label })}</p>
      <div className="ld__scroll scroll">
        {entries.length === 0 && <p className="ld-bubble ld-bubble__text ld-bubble--quiet">{t('life.dec.noResult')}</p>}
        {entries.map(e => (
          <div key={e.i} className="ld-bubble ld-result">
            <p className="ld-bubble__text">{e.text}</p>
            {e.fact && <p className="ld-fact ld-fact--in">{e.fact}</p>}
            {e.fx.length > 0 && (
              <ul className="ld-fx">
                {e.fx.map(f => (
                  <li key={f.k} className="ld-fx__chip"><span className="ld-fx__dot" style={{ background: fxColor(f.k) }} aria-hidden="true" />{fxText(f.k, f.d)}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      <div className="ld-actions">
        <button type="button" className="ld-cta ld-cta--green k-o" onClick={onContinue}>{t('decision.continue')}</button>
      </div>
    </>
  );
}
