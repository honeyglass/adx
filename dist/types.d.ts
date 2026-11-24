/**
 * The public types of '@honeyglass/adx'.
 *
 * Answer, Kind: the answer of a call, and who acts after a refusal.
 * Code, Step, CommandStep: a code a tool declares, a next move, and one to a command.
 * Field, GlobalUse: a field of a schema, and how one command takes the global fields.
 * After, Hint: the steps after a command, and the command that helps with a code, at the tool.
 * Tool: what tool() returns.
 *
 * @example import type { Answer } from '@honeyglass/adx';
 */
export type { Answer, Code, CommandStep, Kind, Step } from './core/index.ts';
export type { After, Field, GlobalUse } from './command/index.ts';
export type { Hint } from './steps/index.ts';
export type { Tool } from './tool/index.ts';
