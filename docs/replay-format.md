# Журнал команд одной жизни (`1in8b-replay/1`)

Журнал позволяет воспроизвести жизнь на той же сборке core. Он нужен для регрессий, отчётов об ошибках и сверки будущей Unity-реализации. Адаптер ведёт его с момента рождения: `GameAdapter.exportReplay()`. Если жизнь была загружена из сохранения посреди игры, журнала нет: сессия начинается не с рождения.

```json
{
  "format": "1in8b-replay/1",
  "core": "f98bd80c…effb5",
  "generator": "extract-core/1",
  "entropy": -1234567890,
  "prefs": { "mode": "birth", "pace": 60 },
  "stepSeconds": 0.016666666666666666,
  "commands": [
    { "step": 0, "at": 1793525400000, "cmd": "startLife", "args": [] },
    { "step": 0, "at": 1793525407000, "cmd": "revealCertificate", "args": [] },
    { "step": 0, "at": 1793525416000, "cmd": "beginLife", "args": [] },
    { "step": 812, "at": 1793525420000, "cmd": "choose", "args": ["temper", "act", ""] },
    { "step": 2400, "at": 1793525460000, "cmd": "setFocus", "args": ["study"] }
  ],
  "endStep": 160532
}
```

| Поле | Значение |
|---|---|
| `core` | SHA-256 исходного `game.en.js`. Воспроизведение на другой сборке отклоняется |
| `entropy` | 32-битное состояние `Math.random` ядра в момент `startLife` (алгоритм `seedRng` оригинала). Поток сопутствующих жизней выводится из него: `state ^ 0x5bd1e995` |
| `prefs` | `UI.prefs` оригинала при рождении: `mode` и `pace` определяют страну и длину года |
| `stepSeconds` | длина одного шага времени (1/60 с реального времени) |
| `commands[].step` | сколько шагов времени выполнено с рождения до команды. Шаги идут только во время игры: пауза и открытое решение их не считают |
| `commands[].at` | время часов (мс эпохи) в момент команды; влияет на `S.by`, `S.td`, `S.startedAt` |
| `commands[].cmd`, `args` | `startLife`, `revealCertificate`, `beginLife`, `choose [decisionId, key, note]`, `togglePause`, `setPaused [bool]`, `setSpeed [n]`, `toggleFastForward`, `setFocus [key]` |
| `endStep` | шаги после последней команды до момента выгрузки |

Воспроизведение: `node --experimental-strip-types tools/harness/replay.mjs replay.json`. Команда печатает фазу, возраст, число решений и SHA-256 итогового `S`. Тест `tests/core/adapter.test.mjs` записывает полную жизнь со сменой фокуса, скорости и паузами, затем воспроизводит её и сравнивает хеши.

Для Unity: те же команды, порядок, шаги и начальное состояние потока должны давать тот же `S`. Сравнивайте JSON `S` после каждой команды с результатом этого инструмента.
