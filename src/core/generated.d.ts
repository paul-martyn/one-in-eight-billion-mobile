// Типы для модулей, которые создаёт tools/core/extract-core.mjs.
declare module '*/generated/game.en.core.js' {
  export const CORE_META: {
    generator: string;
    source: string;
    sourceSha256: string;
    sourceBytes: number;
    freeGlobals: Record<string, 'builtin' | 'controlled' | 'late' | 'host'>;
    topLevelCount: number;
  };
  export function instantiateCore(env: { globals: Record<string, unknown> }): {
    top: Record<string, any>;
    setLateGlobal(name: string, value: unknown): void;
  };
}
declare module '*/generated/era.core.js' {
  export const ERA: unknown;
}
