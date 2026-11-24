/**
 * The public types of '@honeyglass/adx'.
 *
 * Answer, Kind: the answer of a call, and who acts after a refusal.
 * Code, Step: a code a tool declares, and a next move.
 * Field, GlobalUse: a field of a schema, and how one command takes the global fields.
 * Tool: what tool() returns.
 *
 * @example import type { Answer } from '@honeyglass/adx';
 */
export type { Answer, Code, Kind, Step } from './core/index.ts';
export type { Field, GlobalUse } from './command/index.ts';
export type { Tool } from './tool/index.ts';
