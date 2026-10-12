import { FileStorage, FileUpload } from '../domain/file-storage';

/**
 * Uploads `files` and hands their URLs, in the same order, to `use`. If any upload or `use` fails, deletes the files
 * already uploaded and rethrows the original error: the deletes are best effort, since a file left behind is only
 * wasted space.
 *
 * @throws the error of the failed upload, or the one `use` threw
 */
export async function withUploadedFiles<T>(
  storage: FileStorage,
  files: FileUpload[],
  use: (urls: string[]) => Promise<T>,
): Promise<T> {
  const uploads = await Promise.allSettled(
    files.map((file) => storage.upload(file)),
  );
  const urls = uploads.flatMap((upload) =>
    upload.status === 'fulfilled' ? [upload.value] : [],
  );
  const discardFiles = () =>
    Promise.all(urls.map((url) => storage.delete(url).catch(() => undefined)));
  const failed = uploads.find((upload) => upload.status === 'rejected');
  if (failed) {
    await discardFiles();
    throw failed.reason;
  }
  try {
    return await use(urls);
  } catch (error) {
    await discardFiles();
    throw error;
  }
}
