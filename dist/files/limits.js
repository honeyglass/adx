/**
 * The constants of files/.
 *
 * FILE_MODE, FOLDER_MODE: the modes of a new file and of a folder adx makes (decision 17).
 * CHANGES_LIMIT: how many entries each list of changes holds (decision 19).
 * CHANGES_BYTES: the largest old file a replace reads for its changes.
 * NAME_BYTES: the longest name of a file or folder a path may hold.
 *
 * @example const mode = options.mode ?? FILE_MODE;
 */
/** Only the person reads a file of a root, unless the author names another mode. */
export const FILE_MODE = 0o600;
export const FOLDER_MODE = 0o700;
/** Twenty: enough to see what a replace loses, few enough to read; `more` counts the rest. */
export const CHANGES_LIMIT = 20;
/** One MiB: an old file up to it is read for its changes; a larger one changes as a whole. */
export const CHANGES_BYTES = 1_048_576;
/** The longest name most file systems hold, in bytes: ext4, APFS and NTFS (in UTF-16 units). */
export const NAME_BYTES = 255;
