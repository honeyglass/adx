/**
 * The codes adx raises itself, with their kinds and hints, as the guide lists adx's own codes.
 *
 * unknownCommand, optionBeforeCommand: a word that is no command, and an option before one.
 * unknownOption, unexpectedArgument: an option the command does not take, and a stray word.
 * missingValue, unexpectedValue, repeatedOption: an option without its value, a switch with
 * one, and a field given twice.
 * invalidJson, missingInput, inputTooLarge: a --json that holds no JSON object, a --json - with
 * nothing piped in, and stdin past its limit.
 * notInList, notInListAt: a value outside the list of its option, and its issue at a field.
 * schemaFailed: an input that fails the schema of its command.
 * pathOutside, fileNotFound, notAFile, notAFolder, alreadyExists: a path out of its root, a
 * missing file, an entry of the wrong kind, and a file a write would replace without --replace.
 * urlNotAllowed: an address of a request that adx does not send to.
 * rootNotFound, storedInvalid: a root that is not there, and a file that fails its schema.
 * newerVersion: a stored file of a newer format than the tool reads.
 * envMissing: a variable the tool reads, such as its token, that is not set.
 * declaration: a setup of the tool that is wrong in a way the compiler cannot see.
 * systemRefused, networkFailed, serverBusy, accessRefused, remoteRefused: an error nobody mapped.
 * unknownError: any other error, a bug.
 * ADX_CODES: every code above, in the order `schema` lists them.
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
export const missingInput = code('MISSING_INPUT', 'fix', 'Pipe the JSON object into stdin, or pass it after --json');
export const inputTooLarge = code('INPUT_TOO_LARGE', 'fix', 'Pass a smaller input');
export const notInList = code('NOT_IN_LIST', 'fix', 'Use a value the list answers');
/**
 * An enum and a source of `values` both refuse a value with it, so both say it alike.
 *
 * @param path - the field, and the index of the value when the field holds a list
 * @param value - the value as the call gave it
 * @returns the issue, which names the value as JSON
 */
export const notInListAt = (path, value) => notInList.at(path, `${JSON.stringify(value)} is not in the list of ${path[0]}`);
export const pathOutside = code('PATH_OUTSIDE', 'fix', 'Name a path inside the folder of the root');
export const fileNotFound = code('FILE_NOT_FOUND', 'fix', 'Name a file that exists');
export const notAFile = code('NOT_A_FILE', 'fix', 'Name a file, not a folder');
export const notAFolder = code('NOT_A_FOLDER', 'fix', 'Name a folder, not a file');
/** Its issues say per file whether --replace helps, since a command may not take it. */
export const alreadyExists = code('ALREADY_EXISTS', 'fix', 'Add --replace to overwrite the file, or pick another name');
export const urlNotAllowed = code('URL_NOT_ALLOWED', 'fix', 'Give a value that names one item, and an http or https address for the server');
export const rootNotFound = code('ROOT_NOT_FOUND', 'ask', 'Ask the person for the folder: the one the message names is not there');
export const envMissing = code('ENV_MISSING', 'ask', 'Ask the person to set the variable the message names');
export const storedInvalid = code('STORED_INVALID', 'ask', 'Ask the person to fix the file the message names');
export const newerVersion = code('NEWER_VERSION', 'ask', 'Ask the person to update the tool, which reads an older format of the data');
export const declaration = code('DECLARATION', 'bug', 'Stop and tell the person: the setup of the tool is wrong where the message says');
export const systemRefused = code('SYSTEM_REFUSED', 'ask', 'Ask the person to fix the file or the disk the message names');
export const networkFailed = code('NETWORK_FAILED', 'retry', 'Call again in a minute');
export const serverBusy = code('SERVER_BUSY', 'retry', 'Call again in a minute');
export const accessRefused = code('ACCESS_REFUSED', 'ask', 'Ask the person for access');
export const remoteRefused = code('REMOTE_REFUSED', 'ask', 'Ask the person: the server refused the request');
export const unknownError = code('UNKNOWN_ERROR', 'bug', 'Stop and tell the person: the tool has a bug, and stderr names the error');
/** In the order of the guide's list of adx's codes: those of kind fix, then ask, retry, bug. */
export const ADX_CODES = [
    unknownCommand,
    optionBeforeCommand,
    unknownOption,
    unexpectedArgument,
    unexpectedValue,
    repeatedOption,
    missingValue,
    missingInput,
    invalidJson,
    inputTooLarge,
    schemaFailed,
    notInList,
    pathOutside,
    fileNotFound,
    notAFile,
    notAFolder,
    alreadyExists,
    urlNotAllowed,
    rootNotFound,
    envMissing,
    systemRefused,
    accessRefused,
    remoteRefused,
    newerVersion,
    storedInvalid,
    networkFailed,
    serverBusy,
    declaration,
    unknownError,
];
