// Модель временного экрана. Это не состояние персонажа и не контракт движка.
export type FoundationViewModel = Readonly<{
  source: 'fixture';
  title: string;
  subtitle: string;
  message: string;
}>;
