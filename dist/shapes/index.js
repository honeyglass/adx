/**
 * Shapes: the schemas a caller writes and no command takes whole, and a part checked against one.
 *
 * check: a part of the input checked in the handler, answered as SCHEMA issues.
 * Shapes, jsonSchemaOf: the shapes of a tool, and a schema as JSON Schema, which `schema` prints.
 * bareSchemaOf: a schema as JSON Schema without its metadata, for a stored format's fingerprint.
 * shapeNameAt: the shape a SCHEMA issue lies in, whose schema its command shows.
 *
 * @example import { check, jsonSchemaOf, shapeNameAt } from '../shapes/index.ts';
 */
export { check } from "./check.js";
export { shapeNameAt } from "./named.js";
export { bareSchemaOf, jsonSchemaOf } from "./shape.js";
