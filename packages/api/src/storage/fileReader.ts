export interface FileReaderAdapter {
  readAsBinary(fileOrUri: File | Blob | string): Promise<ArrayBuffer | Blob>;
  readChunk(fileOrUri: File | Blob | string, start: number, end: number): Promise<ArrayBuffer | Blob>;
  getSize(fileOrUri: File | Blob | string): Promise<number>;
  /**
   * Optional — platform-specific PUT to a presigned R2/S3 URL.
   * When provided, `uploadFile` delegates the upload step to this method instead of using
   * `fetch` directly. Use in browser environments to route through a local proxy and avoid
   * the CORS preflight that blocks direct cross-origin PUT requests.
   */
  putToPresignedUrl?(url: string, body: ArrayBuffer | Blob, contentType: string): Promise<void>;
  /**
   * Optional — native streaming PUT to a presigned R2/S3 URL without loading the file
   * into memory first.  When provided, `uploadFile` uses this path INSTEAD of calling
   * `readAsBinary`, making it safe for large files (e.g. videos) on memory-constrained
   * platforms such as React Native / Android.
   *
   * Only called when `fileOrUri` is a string URI (i.e. a native file path).
   */
  streamUploadToPresignedUrl?(fileOrUri: string, url: string, contentType: string, sizeBytes: number): Promise<void>;
}
