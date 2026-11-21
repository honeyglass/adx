export const RULES = ['error-wrap', 'no-naked-return', 'ctx-first'] as const;
export declare function check(
  file: string,
  source: string,
  only: readonly string[],
): { id: string; rule: string; file: string; line: number; message: string; source: string }[];
