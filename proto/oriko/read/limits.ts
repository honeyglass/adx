// The limits of read on a Word file and a download.
export const READ_LIMITS = {
  documentBytes: 5_000_000, // the text inside a Word file once unpacked
  redirects: 5,
  downloadSeconds: 20,
} as const;
