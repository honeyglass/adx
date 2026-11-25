/** @param close - what closes the thing; it runs once, by release or by a signal */
export declare function hold(close: () => void): () => void;
export declare function endOnSignals(): void;
