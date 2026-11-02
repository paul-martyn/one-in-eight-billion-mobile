// Interfaces for standalone engine sources.
declare module '*/engine/game.en.js' {
  export const CORE_META: {generator: string; sourceSha256: string; sourceBytes: number; freeGlobals: Record<string, string>; topLevelCount: number;};
  export function instantiateCore(env: {globals: Record<string, unknown>; loadEra?: () => Promise<unknown>}): {top: Record<string, any>; setLateGlobal(name: string, value: unknown): void;};
}
declare module '*/engine/game.ru.js' {
  export const CORE_META: {generator: string; sourceSha256: string; sourceBytes: number; freeGlobals: Record<string, string>; topLevelCount: number;};
  export function instantiateCore(env: {globals: Record<string, unknown>; loadEra?: () => Promise<unknown>}): {top: Record<string, any>; setLateGlobal(name: string, value: unknown): void;};
}
declare module '*/engine/game.es.js' {
  export const CORE_META: {generator: string; sourceSha256: string; sourceBytes: number; freeGlobals: Record<string, string>; topLevelCount: number;};
  export function instantiateCore(env: {globals: Record<string, unknown>; loadEra?: () => Promise<unknown>}): {top: Record<string, any>; setLateGlobal(name: string, value: unknown): void;};
}
declare module '*/engine/game.fr.js' {
  export const CORE_META: {generator: string; sourceSha256: string; sourceBytes: number; freeGlobals: Record<string, string>; topLevelCount: number;};
  export function instantiateCore(env: {globals: Record<string, unknown>; loadEra?: () => Promise<unknown>}): {top: Record<string, any>; setLateGlobal(name: string, value: unknown): void;};
}
declare module '*/engine/game.de.js' {
  export const CORE_META: {generator: string; sourceSha256: string; sourceBytes: number; freeGlobals: Record<string, string>; topLevelCount: number;};
  export function instantiateCore(env: {globals: Record<string, unknown>; loadEra?: () => Promise<unknown>}): {top: Record<string, any>; setLateGlobal(name: string, value: unknown): void;};
}
declare module '*/engine/era.js' { export const ERA: unknown; }
