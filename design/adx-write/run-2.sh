#!/bin/sh
cd "$(dirname "$0")"
node fail.ts > results-fail.txt 2>&1
node crash.ts > results-crash.txt 2>&1
# the recommendation with fsync, after the flat poll
node lost.ts lock-fn 20 100 0 1 > results-lost-2.jsonl
node lost.ts lock-fn 20 100 5 1 >> results-lost-2.jsonl
# FAT32: no hard links, 2 s times; the kernel lock and the link fallback
mkdir -p vols/mnt-msdosfat32/runs
RUNS=vols/mnt-msdosfat32/runs node lost.ts lock-fn 20 50 0 1 >> results-lost-2.jsonl
RUNS=vols/mnt-msdosfat32/runs node lost.ts lock-value 20 50 0 0 >> results-lost-2.jsonl
RUNS=vols/mnt-msdosfat32/runs node lost.ts naive 20 50 0 0 >> results-lost-2.jsonl
echo finished
