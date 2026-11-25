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
export { call } from "./call.js";
export { textOf } from "./text.js";
export { SKILL_NAME } from "./limits.js";
export { inScratch } from "./scene.js";
export { specOf, tool } from "./tool.js";
