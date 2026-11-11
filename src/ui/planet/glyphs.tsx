// Лицо малыша и череп — значки рождений и смертей (счётчики, карточка страны).
// Рисунок — из макетов StartCute / GlobeLive.

export function BabyGlyph({ size = 40 }: { size?: number }) {
  return (
    <svg className="glyph" width={size} height={size} viewBox="5 6.5 30 30" aria-hidden="true">
      <circle cx="20" cy="22" r="13" fill="#ffe0c2" stroke="#7b4b2a" strokeWidth="2" />
      <path d="M20.5 9.6c-2.6-.4-4.4 1.4-3.6 3.3.7 1.5 2.9 1.4 3.2-.2" fill="none" stroke="#7b4b2a" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M13.8 22.2q2.1-2.4 4.2 0M22 22.2q2.1-2.4 4.2 0" fill="none" stroke="#5a3418" strokeWidth="1.8" strokeLinecap="round" />
      <ellipse cx="13" cy="26" rx="2.5" ry="1.6" fill="#ff9fb0" />
      <ellipse cx="27" cy="26" rx="2.5" ry="1.6" fill="#ff9fb0" />
      <path d="M17.4 27.4q2.6 2.2 5.2 0" fill="none" stroke="#5a3418" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function SkullGlyph({ size = 38 }: { size?: number }) {
  return (
    <svg className="glyph" width={size} height={size} viewBox="8 5 84 86" aria-hidden="true">
      <path d="M50 9C27 9 13 25 13 45c0 13 7 21 15 25.5V80c0 4 3 7 7 7h30c4 0 7-3 7-7v-9.5C80 66 87 58 87 45 87 25 73 9 50 9Z" fill="#fffaf0" stroke="#5a3418" strokeWidth="4.5" strokeLinejoin="round" />
      <ellipse cx="35.5" cy="46" rx="9.5" ry="10.5" fill="#2a2333" />
      <ellipse cx="64.5" cy="46" rx="9.5" ry="10.5" fill="#2a2333" />
      <circle cx="38.5" cy="42" r="2.8" fill="#ffffff" />
      <circle cx="67.5" cy="42" r="2.8" fill="#ffffff" />
      <path d="M50 56.5l-4.5 7.5h9Z" fill="#2a2333" stroke="#2a2333" strokeWidth="1.5" strokeLinejoin="round" />
      <ellipse cx="24" cy="61" rx="6" ry="3.6" fill="#ff9fb0" />
      <ellipse cx="76" cy="61" rx="6" ry="3.6" fill="#ff9fb0" />
      <path d="M36 75.5h28M43 75.5V86M50 75.5V86M57 75.5V86" fill="none" stroke="#5a3418" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}
