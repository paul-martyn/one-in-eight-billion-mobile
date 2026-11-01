import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import '@fontsource/rubik/cyrillic-500.css';
import '@fontsource/rubik/cyrillic-600.css';
import '@fontsource/rubik/cyrillic-700.css';
import '@fontsource/courier-prime/400.css';
import '@fontsource/courier-prime/700.css';
import '@fontsource/caveat/600.css';
import { App } from './app/App';
import { setReducedMotion } from './ui/motionPrefs';
import './app/styles.css';

// ?motion=reduced — тот же путь без анимаций (проверка и доступность).
const motionParam = new URLSearchParams(location.search).get('motion');
if (motionParam === 'reduced') setReducedMotion(true);

const root = document.getElementById('root');
if (!root) throw new Error('Не найден контейнер приложения');
createRoot(root).render(<StrictMode><App /></StrictMode>);
