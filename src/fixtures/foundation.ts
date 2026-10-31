import type { FoundationViewModel } from '../contracts/foundation';

// Только статическое наполнение макета. Здесь нет генерации игровой жизни.
export const foundationFixture: FoundationViewModel = Object.freeze({
  source: 'fixture',
  title: 'One in Eight Billion',
  subtitle: 'Мобильная версия',
  message: 'Здесь появится новая история.',
});
