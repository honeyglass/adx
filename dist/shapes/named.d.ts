import type { SchemaPlace } from '../core/index.ts';
import type { Shapes } from './shape.ts';
/**
 * @param shapes - the shapes of the tool
 * @param place - where the issue stands in the schema that failed
 * @returns the name of the innermost registered shape, or undefined when it lies in none
 */
export declare function shapeNameAt(shapes: Shapes, place: SchemaPlace): string | undefined;
