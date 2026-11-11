// Общий «Назад»: Esc на клавиатуре (и системная кнопка «Назад» Android в Unity-порте,
// где она приходит как Escape). Обработчики регистрируются слоями:
//   dialog — открытое окно (закрыть безопасным действием: «Продолжить», «Отмена»);
//   screen — экран (вкладка → «Жизнь», «Жизнь» → пауза, итоги → главное меню);
//   flow   — стек экранов (вернуться на экран, открытый поверх).
// Срабатывает верхний слой; внутри слоя — последний зарегистрированный. Обработчик,
// вернувший false, пропускает нажатие ниже. Только представление: состояние игры
// меняют сами обработчики через команды адаптера.

export type BackLayer = 'flow' | 'screen' | 'dialog';
/** false — «не моё», нажатие идёт дальше; иначе нажатие обработано. */
export type BackHandler = () => boolean | void;

const RANK: Record<BackLayer, number> = { flow: 0, screen: 1, dialog: 2 };

export type BackStack = {
  /** Регистрирует обработчик; возвращает функцию снятия. */
  add(layer: BackLayer, handler: BackHandler): () => void;
  /** Передаёт «Назад» обработчикам сверху вниз; true — кто-то обработал. */
  handle(): boolean;
  size(): number;
};

export function createBackStack(): BackStack {
  let seq = 0;
  const items = new Map<number, { rank: number; order: number; handler: BackHandler }>();
  return {
    add(layer, handler) {
      const id = ++seq;
      items.set(id, { rank: RANK[layer], order: id, handler });
      return () => { items.delete(id); };
    },
    handle() {
      const ordered = [...items.values()].sort((a, b) => b.rank - a.rank || b.order - a.order);
      for (const item of ordered) if (item.handler() !== false) return true;
      return false;
    },
    size: () => items.size,
  };
}

/** Один стек на приложение. */
export const backStack = createBackStack();
