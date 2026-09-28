import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { FileStorage, FileUpload } from '../domain/file-storage';

export interface S3Config {
  /** Unset only for AWS S3. */
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl: string;
}

const REQUIRED = [
  'S3_REGION',
  'S3_BUCKET',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
  'S3_PUBLIC_URL',
] as const;

/** Throws naming every missing variable, so a misconfigured back fails at startup, not on its first upload. */
export function readS3Config(
  env: Record<string, string | undefined> = process.env,
): S3Config {
  const missing = REQUIRED.filter((name) => !env[name]);
  if (missing.length > 0) {
    throw new Error(
      `File storage is not configured: missing ${missing.join(', ')}`,
    );
  }
  return {
    endpoint: env.S3_ENDPOINT || undefined,
    region: env.S3_REGION!,
    bucket: env.S3_BUCKET!,
    accessKeyId: env.S3_ACCESS_KEY_ID!,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
    publicUrl: env.S3_PUBLIC_URL!.replace(/\/+$/, ''),
  };
}

export class S3FileStorage implements FileStorage {
  private readonly client: S3Client;

  constructor(private readonly config: S3Config) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      // Custom endpoints (R2, MinIO) address buckets by path, not by subdomain.
      forcePathStyle: config.endpoint !== undefined,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async upload({ content, contentType }: FileUpload) {
    const key = randomUUID();
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: content,
        ContentType: contentType,
      }),
    );
    return `${this.config.publicUrl}/${key}`;
  }

  async delete(url: string) {
    const prefix = `${this.config.publicUrl}/`;
    if (!url.startsWith(prefix)) {
      throw new Error(`${url} is not a URL of this file storage`);
    }
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: url.slice(prefix.length),
      }),
    );
  }
}
