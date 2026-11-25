type Lost = (error: unknown) => void;
/** @param lost - what the program does with the error, which the process then no longer ends on */
export declare function catchLost(lost: Lost): void;
export {};
