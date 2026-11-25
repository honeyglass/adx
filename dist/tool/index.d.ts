/**
 * The shell of adx: it puts the features together into a tool.
 *
 * Tool, ToolSpec, tool: the tool and what tool() takes.
 * call, specOf, inScratch: one whole call, what a call reads of a tool, and the scratch folders
 * of a test, for the test kit's run().
 * textOf: the terminal form of an answer, for adxcheck.
 * SKILL_NAME: the form of a skill name, which the test kit checks before it builds a path of one.
 *
 * @example import { call, specOf } from '../tool/index.ts';
 */
export { call } from './call.ts';
export { textOf } from './text.ts';
export { SKILL_NAME } from './limits.ts';
export { inScratch } from './scene.ts';
export type { Shell, Tool, ToolSpec } from './tool.ts';
export { specOf, tool } from './tool.ts';
