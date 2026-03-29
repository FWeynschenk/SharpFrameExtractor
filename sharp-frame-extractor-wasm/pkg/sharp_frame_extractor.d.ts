/* tslint:disable */
/* eslint-disable */
/**
* @param {Uint8Array} frame_data
* @param {Uint8Array} target_color
* @returns {number}
*/
export function calculate_color_similarity(frame_data: Uint8Array, target_color: Uint8Array): number;
/**
* @param {Uint8Array} frame_data
* @returns {any}
*/
export function average_color(frame_data: Uint8Array): any;
/**
* @param {Uint8Array} frame_data
* @param {number} width
* @returns {any}
*/
export function average_color_per_line(frame_data: Uint8Array, width: number): any;
/**
* @param {Uint8Array} frame_data
* @param {number} width
* @param {number} height
* @returns {number}
*/
export function compute_sharpness(frame_data: Uint8Array, width: number, height: number): number;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly calculate_color_similarity: (a: number, b: number, c: number, d: number, e: number) => number;
  readonly average_color: (a: number, b: number, c: number) => number;
  readonly average_color_per_line: (a: number, b: number, c: number, d: number) => number;
  readonly compute_sharpness: (a: number, b: number, c: number, d: number, e: number) => number;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_exn_store: (a: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
