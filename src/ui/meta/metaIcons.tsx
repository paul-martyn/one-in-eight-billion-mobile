// Иконки мета-слоя из HubCute.dc.html: молния энергии, пачка купюр,
// кристалл, плюс. Все декоративные (aria-hidden), подписи даёт разметка.

/** Большая молния у плашки энергии (viewBox 36). */
export const BoltBig = ({ size = 38 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden="true" className="meta-pill__icon">
    <path d="M21.5 1.5 L6.5 20 H16.5 L13.5 34.5 L29.5 14 H19.5 Z" fill="#ffd75a" stroke="#5a3418" strokeWidth="2.2" strokeLinejoin="round" />
  </svg>
);

/** Малая молния цены и строки ожидания (viewBox 24). */
export const BoltSmall = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ flex: 'none' }}>
    <path d="M13.5 2 L5 13.5 H11 L9.5 22 L19 9.5 H12.8 Z" fill="#ffd75a" stroke="#5a3418" strokeWidth="1.8" strokeLinejoin="round" />
  </svg>
);

/** Пачка купюр (доллары). className по умолчанию — место иконки у плашки. */
export const BanknotesBig = ({ size = 38, className = 'meta-pill__icon' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden="true" className={className}>
    <g transform="rotate(-12 18 18)">
      <rect x="6.5" y="6" width="26" height="17" rx="3" fill="#b6e57f" stroke="#5a3418" strokeWidth="2" />
      <rect x="3" y="11.5" width="26" height="17" rx="3" fill="#6cc04a" stroke="#5a3418" strokeWidth="2" />
      <circle cx="16" cy="20" r="5.4" fill="#b6e57f" stroke="#5a3418" strokeWidth="1.6" />
      <text x="16" y="23.7" textAnchor="middle" fontFamily="Fredoka, sans-serif" fontSize="10.5" fontWeight="700" fill="#2f6a1a">$</text>
    </g>
  </svg>
);

/** Кристалл. className по умолчанию — место иконки у плашки. */
export const GemBig = ({ size = 38, className = 'meta-pill__icon' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden="true" className={className}>
    <path d="M10 5h16l7.5 9L18 32.5 2.5 14Z" fill="#ff7ad9" />
    <path d="M10 5h16l7.5 9h-31Z" fill="#ffb3ec" />
    <path d="M2.5 14h31M14 5l-3.5 9L18 32.5 25.5 14 22 5" fill="none" stroke="#5a3418" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M10 5h16l7.5 9L18 32.5 2.5 14Z" fill="none" stroke="#5a3418" strokeWidth="2.2" strokeLinejoin="round" />
  </svg>
);

export const PlusGlyph = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16M4 12h16" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" /></svg>
);
