// Иконки раздела «Spend & invest» (по макетам ActivitiesCute / MoneyCute, design-tabs §0.5).

/** Купюра для «цены» (17 × 13, cost chip макета). */
export function NoteIcon({ w = 17, h = 13 }: { w?: number; h?: number }) {
  return (
    <svg width={w} height={h} viewBox="0 0 32 24" aria-hidden="true" className="spd-ico">
      <rect x="2" y="3" width="28" height="18" rx="4" fill="#8fd14f" stroke="#7b4b2a" strokeWidth="3" />
      <circle cx="16" cy="12" r="4.5" fill="#c9f09a" stroke="#7b4b2a" strokeWidth="2.4" />
    </svg>
  );
}

/** Замок «запертого» ряда (13 × 13). */
export function LockSmall({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="spd-ico">
      <rect x="5" y="10" width="14" height="11" rx="2.5" fill="#e8d5b0" stroke="#7b4b2a" strokeWidth="2.2" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" fill="none" stroke="#7b4b2a" strokeWidth="2.2" />
    </svg>
  );
}

/** Шеврон «ещё» (раскрытие списка). */
export function MoreChevron({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className="spd-ico" style={{ transform: open ? 'rotate(90deg)' : undefined }}>
      <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Медальон окна подтверждения: стопка купюр. */
export function ConfirmMedallion() {
  return (
    <svg width="54" height="54" viewBox="0 0 48 48" aria-hidden="true">
      <rect x="6" y="16" width="34" height="22" rx="5" fill="#c9f09a" stroke="#7b4b2a" strokeWidth="2.6" transform="rotate(-8 23 27)" />
      <rect x="8" y="14" width="34" height="22" rx="5" fill="#8fd14f" stroke="#7b4b2a" strokeWidth="2.6" />
      <circle cx="25" cy="25" r="5.5" fill="#c9f09a" stroke="#7b4b2a" strokeWidth="2.4" />
      <path d="M25 22v6" stroke="#7b4b2a" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/** Медальон окна результата: галочка на купюре. */
export function DoneMedallion() {
  return (
    <svg width="54" height="54" viewBox="0 0 48 48" aria-hidden="true">
      <rect x="6" y="12" width="36" height="24" rx="5" fill="#8fd14f" stroke="#7b4b2a" strokeWidth="2.6" />
      <circle cx="24" cy="24" r="9" fill="#fffaf0" stroke="#7b4b2a" strokeWidth="2.4" />
      <path d="M19.5 24.5l3 3 6-6.5" fill="none" stroke="#2f7d1f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
