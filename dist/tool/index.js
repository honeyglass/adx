/**
 * The shell of adx: it puts the features together into a tool.
 *
 * Tool, ToolSpec, tool: the tool and what tool() takes.
 * call, specOf: one whole call, and what a call reads of a tool, for the test kit's run().
 *
 * @example import { call, specOf } from '../tool/index.ts';
 */
export { call } from "./call.js";
export { specOf, tool } from "./tool.js";
