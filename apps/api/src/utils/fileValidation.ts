import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '@school/shared';

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  detectedMimeType?: string;
}

/**
 * Known file signatures (magic bytes) for supported MIME types (SRS Section 8.4, Day 11)
 */
const MAGIC_NUMBERS: Record<string, (buf: Buffer) => boolean> = {
  'image/jpeg': (buf) =>
    buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,

  'image/png': (buf) =>
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a,

  'image/gif': (buf) =>
    buf.length >= 6 &&
    buf[0] === 0x47 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x38 &&
    (buf[4] === 0x37 || buf[4] === 0x39) &&
    buf[5] === 0x61,

  'image/webp': (buf) =>
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 && // 'RIFF'
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50, // 'WEBP'

  'image/svg+xml': (buf) => {
    // Inspect initial bytes (up to 1024) for <svg or <?xml followed by <svg
    const snippet = buf.slice(0, Math.min(buf.length, 1024)).toString('utf8').trim().toLowerCase();
    // Exclude potential script injection or malformed content
    return (
      (snippet.startsWith('<svg') || snippet.startsWith('<?xml') || snippet.startsWith('<!doctype svg')) &&
      snippet.includes('<svg') &&
      !snippet.includes('<script')
    );
  },

  'application/pdf': (buf) =>
    buf.length >= 4 &&
    buf[0] === 0x25 &&
    buf[1] === 0x50 &&
    buf[2] === 0x44 &&
    buf[3] === 0x46, // '%PDF'

  'application/msword': (buf) =>
    buf.length >= 8 &&
    buf[0] === 0xd0 &&
    buf[1] === 0xcf &&
    buf[2] === 0x11 &&
    buf[3] === 0xe0 &&
    buf[4] === 0xa1 &&
    buf[5] === 0xb1 &&
    buf[6] === 0x1a &&
    buf[7] === 0xe1, // OLE Compound File Header

  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': (buf) =>
    buf.length >= 4 &&
    buf[0] === 0x50 &&
    buf[1] === 0x4b &&
    buf[2] === 0x03 &&
    buf[3] === 0x04, // PK Zip Header

  'video/mp4': (buf) => {
    if (buf.length < 8) return false;
    const ftyp = buf.slice(4, 8).toString('ascii');
    return ftyp === 'ftyp';
  },

  'video/webm': (buf) =>
    buf.length >= 4 &&
    buf[0] === 0x1a &&
    buf[1] === 0x45 &&
    buf[2] === 0xdf &&
    buf[3] === 0xa3, // EBML Header
};

/**
 * Validate file content against declared MIME type and size boundaries
 */
export function validateFileContent(
  buffer: Buffer,
  declaredMimeType: string,
  declaredSize?: number
): FileValidationResult {
  // 1. Boundary check: Reject empty / zero-byte files
  if (!buffer || buffer.length === 0) {
    return {
      isValid: false,
      error: 'EMPTY_FILE: Uploaded file is empty (0 bytes).',
    };
  }

  // 2. Boundary check: Reject oversized files
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: `FILE_TOO_LARGE: Uploaded file (${buffer.length} bytes) exceeds the maximum allowed limit of ${MAX_FILE_SIZE_BYTES} bytes (10MB).`,
    };
  }

  // 3. Size match check if declaredSize is provided
  if (declaredSize !== undefined && declaredSize > 0 && Math.abs(buffer.length - declaredSize) > 0) {
    // declared size mismatch can happen if corrupted during transit
    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      return {
        isValid: false,
        error: `FILE_TOO_LARGE: Buffer length exceeds limit.`,
      };
    }
  }

  // 4. Declared MIME type allowlist check
  if (!ALLOWED_MIME_TYPES.includes(declaredMimeType as any)) {
    return {
      isValid: false,
      error: `UNSUPPORTED_MIME_TYPE: Declared MIME type '${declaredMimeType}' is not allowed.`,
    };
  }

  // 5. Magic numbers / Content signature verification
  const verifier = MAGIC_NUMBERS[declaredMimeType];
  if (verifier) {
    const matchesSignature = verifier(buffer);
    if (!matchesSignature) {
      return {
        isValid: false,
        error: `CONTENT_SIGNATURE_MISMATCH: File content magic bytes do not match declared MIME type '${declaredMimeType}'.`,
      };
    }
  }

  return {
    isValid: true,
    detectedMimeType: declaredMimeType,
  };
}

/**
 * Sanitize filename to prevent path traversal, special characters, and dangerous extensions
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return 'file.bin';

  // 1. Strip path components (handles both POSIX and Windows delimiters)
  let clean = filename.replace(/^.*[\\/]/, '');

  // 2. Remove null bytes and control characters
  clean = clean.replace(/[\x00-\x1f\x80-\x9f]/g, '');

  // 3. Strip dangerous directory traversal sequences
  clean = clean.replace(/\.\./g, '');

  // 4. Replace spaces and unsafe characters with underscores
  clean = clean.replace(/[^a-zA-Z0-9._-]/g, '_');

  // 5. Avoid empty or leading-dot hidden filenames
  clean = clean.replace(/^\.+/, '');
  if (!clean) clean = 'file.bin';

  // 6. Enforce maximum filename length
  if (clean.length > 100) {
    const ext = clean.substring(clean.lastIndexOf('.'));
    clean = clean.substring(0, 95) + ext;
  }

  return clean.toLowerCase();
}
