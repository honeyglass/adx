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
export declare const FILE_MODE = 384;
export declare const FOLDER_MODE = 448;
/** Twenty: enough to see what a replace loses, few enough to read; `more` counts the rest. */
export declare const CHANGES_LIMIT = 20;
/** One MiB: an old file up to it is read for its changes; a larger one changes as a whole. */
export declare const CHANGES_BYTES = 1048576;
/** The longest name most file systems hold, in bytes: ext4, APFS and NTFS (in UTF-16 units). */
export declare const NAME_BYTES = 255;
