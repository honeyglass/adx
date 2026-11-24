/**
 * The codes adx raises itself, with their kinds and hints, as the guide lists adx's own codes.
 *
 * unknownCommand: a call whose first word is no command of the tool.
 * schemaFailed: an input that fails the schema of its command.
 * unexpectedArgument, missingValue: a word where an option stands, and an option without value.
 * systemRefused, networkFailed, serverBusy, accessRefused, remoteRefused: an error nobody mapped.
 * unknownError: any other error, a bug.
 *
 * @example return refusedWith([unknownCommand.issue(`hello has no command ${word}`)], NOTHING_CHANGED);
 */
import { code } from "./code.js";
export const unknownCommand = code('UNKNOWN_COMMAND', 'fix', 'Use a command the tool lists');
export const schemaFailed = code('SCHEMA', 'fix', 'Pass the input the schema of the command shows');
export const unexpectedArgument = code('UNEXPECTED_ARGUMENT', 'fix', 'Remove the word, or pass it as the value of an option');
export const missingValue = code('MISSING_VALUE', 'fix', 'Give the option a value');
export const systemRefused = code('SYSTEM_REFUSED', 'ask', 'Ask the person to fix the file or the disk the message names');
export const networkFailed = code('NETWORK_FAILED', 'retry', 'Call again in a minute');
export const serverBusy = code('SERVER_BUSY', 'retry', 'Call again in a minute');
export const accessRefused = code('ACCESS_REFUSED', 'ask', 'Ask the person for access');
export const remoteRefused = code('REMOTE_REFUSED', 'ask', 'Ask the person: the server refused the request');
export const unknownError = code('UNKNOWN_ERROR', 'bug', 'Stop and tell the person: the tool has a bug, and stderr names the error');
