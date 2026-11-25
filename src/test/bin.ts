#!/usr/bin/env node
/**
 * The program adxcheck, which package.json names under `bin`.
 *
 * It reads its arguments and the terminal through node/, writes what adxcheck answers, and on
 * SIGINT or SIGTERM ends the programs it checks and removes their scratch folders first.
 *
 * @example pnpm exec adxcheck report --env TRACKER_TOKEN=test-token -- node bin/tracker.ts
 */
import { args, around, endOnSignals, output } from '../node/index.ts';
import { adxcheck } from './adxcheck.ts';

endOnSignals();
output().answer(await adxcheck(args(), around().tty));
