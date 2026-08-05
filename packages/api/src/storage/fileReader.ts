export interface FileReaderAdapter {
  readAsBinary(fileOrUri: File | Blob | string): Promise<ArrayBuffer | Blob>;
  readChunk(fileOrUri: File | Blob | string, start: number, end: number): Promise<ArrayBuffer | Blob>;
  getSize(fileOrUri: File | Blob | string): Promise<number>;
  putToPresignedUrl?(url: string, body: ArrayBuffer | Blob, contentType: string): Promise<void>;
  streamUploadToPresignedUrl?(fileOrUri: string, url: string, contentType: string, sizeBytes: number): Promise<void>;
}
