/**
 * The codes adx raises itself, with their kinds and hints, as the guide lists adx's own codes.
 *
 * unknownCommand, optionBeforeCommand: a word that is no command, and an option before one.
 * unknownOption, unexpectedArgument: an option the command does not take, and a stray word.
 * missingValue, unexpectedValue, repeatedOption: an option without its value, a switch with
 * one, and a field given twice.
 * invalidJson: a --json that holds no JSON object.
 * notInList: a value outside the list of its option.
 * schemaFailed: an input that fails the schema of its command.
 * declaration: a setup of the tool that is wrong in a way the compiler cannot see.
 * systemRefused, networkFailed, serverBusy, accessRefused, remoteRefused: an error nobody mapped.
 * unknownError: any other error, a bug.
 *
 * @example return refusedWith([unknownCommand.issue(`hello has no command ${word}`)], NOTHING_CHANGED);
 */
import { code } from "./code.js";
export const unknownCommand = code('UNKNOWN_COMMAND', 'fix', 'Use a command the tool lists');
export const optionBeforeCommand = code('OPTION_BEFORE_COMMAND', 'fix', 'Put the command words first, then the options');
export const unknownOption = code('UNKNOWN_OPTION', 'fix', 'Use an option the command lists');
export const schemaFailed = code('SCHEMA', 'fix', 'Pass the input the schema of the command shows');
export const unexpectedArgument = code('UNEXPECTED_ARGUMENT', 'fix', 'Remove the word, or pass it as the value of an option');
export const missingValue = code('MISSING_VALUE', 'fix', 'Give the option a value');
export const unexpectedValue = code('UNEXPECTED_VALUE', 'fix', 'Give the switch without a value');
export const repeatedOption = code('REPEATED_OPTION', 'fix', 'Give each field once, as an option or in --json');
export const invalidJson = code('INVALID_JSON', 'fix', 'Pass --json one JSON object');
export const notInList = code('NOT_IN_LIST', 'fix', 'Use a value the list answers');
export const declaration = code('DECLARATION', 'bug', 'Stop and tell the person: the setup of the tool is wrong where the message says');
export const systemRefused = code('SYSTEM_REFUSED', 'ask', 'Ask the person to fix the file or the disk the message names');
export const networkFailed = code('NETWORK_FAILED', 'retry', 'Call again in a minute');
export const serverBusy = code('SERVER_BUSY', 'retry', 'Call again in a minute');
export const accessRefused = code('ACCESS_REFUSED', 'ask', 'Ask the person for access');
export const remoteRefused = code('REMOTE_REFUSED', 'ask', 'Ask the person: the server refused the request');
export const unknownError = code('UNKNOWN_ERROR', 'bug', 'Stop and tell the person: the tool has a bug, and stderr names the error');
