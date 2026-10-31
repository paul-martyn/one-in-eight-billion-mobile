import type { FoundationViewModel } from '../contracts/foundation';

export function FoundationScreen({ model }: { model: FoundationViewModel }) {
  return (
    <main className="foundation-screen" data-source={model.source}>
      <p className="foundation-caption">{model.subtitle}</p>
      <div className="foundation-title">
        <span className="foundation-mark" aria-hidden="true">1</span>
        <h1>{model.title}</h1>
        <p>{model.message}</p>
      </div>
      <p className="foundation-footnote">Основа для будущих экранов</p>
    </main>
  );
}
