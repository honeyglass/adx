// The largest input, photo and read file, which the features share.
export const FILE_LIMITS = {
  inputBytes: 1_000_000, // a CV or a profile is a few thousand bytes
  photoBytes: 20_000_000,
  readBytes: 10_000_000, // a posting, notes or an old CV as a file or a download
} as const;
