#!/bin/sh
# 20 writers, 100 calls each, every mode, plan-to-commit gap 0 and ~5 ms, then the recommendation with fsync on.
cd "$(dirname "$0")"
for gap in 0 5; do
  for mode in naive check lock-value lock-fn; do
    node lost.ts $mode 20 100 $gap 0
  done
done
node lost.ts lock-fn 20 100 0 1
node lost.ts lock-fn 20 100 5 1
