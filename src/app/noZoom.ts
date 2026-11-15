// Зум страницы выключен (просьба пользователя 15 ноября 2026): на телефоне и планшете приложение и так занимает весь
// экран, а щипок или двойное касание сдвигали и обрезали кадр. Двойное касание и щипок в Chrome и Android гасит
// touch-action: pan-x pan-y (src/app/styles.css) и user-scalable=no в index.html; Safari на iOS их для щипка не
// слушает — у него свои события жестов, их здесь и отменяем. Игровой RNG и состояние игры это не трогает.
export function disablePageZoom(doc: Document = document): void {
  const stop = (e: Event) => e.preventDefault();
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) doc.addEventListener(type, stop, { passive: false });
  // Щипок двумя пальцами в старых Safari приходит как touchmove с масштабом не 1.
  doc.addEventListener('touchmove', (e: TouchEvent) => {
    const scale = (e as TouchEvent & { scale?: number }).scale;
    if (typeof scale === 'number' && scale !== 1) e.preventDefault();
  }, { passive: false });
}
