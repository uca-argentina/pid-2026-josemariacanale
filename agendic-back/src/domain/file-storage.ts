export const FILE_STORAGE = Symbol('FileStorage');

export interface FileUpload {
  content: Uint8Array;
  contentType: string;
}

/** Keeps files outside the back's own disk, which does not survive a deploy (ADR 0015). */
export interface FileStorage {
  /** Returns the public, durable URL that serves the file. */
  upload(file: FileUpload): Promise<string>;
  delete(url: string): Promise<void>;
}
