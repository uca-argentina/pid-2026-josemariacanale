import { CreateBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { mkdtempSync, rmSync } from 'node:fs';
import { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import S3rver from 's3rver';
import { readS3Config, S3Config, S3FileStorage } from './s3-file-storage';

const ENV = {
  S3_ENDPOINT: 'http://localhost:9000',
  S3_REGION: 'auto',
  S3_BUCKET: 'agendic',
  S3_ACCESS_KEY_ID: 'key',
  S3_SECRET_ACCESS_KEY: 'secret',
  S3_PUBLIC_URL: 'https://files.example.com',
};

describe('readS3Config', () => {
  it('reads every variable from the environment', () => {
    expect(readS3Config(ENV)).toEqual({
      endpoint: 'http://localhost:9000',
      region: 'auto',
      bucket: 'agendic',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
      publicUrl: 'https://files.example.com',
    });
  });

  it('leaves the endpoint out when it is not set, as AWS S3 does not need one', () => {
    const { S3_ENDPOINT: _, ...env } = ENV;
    expect(readS3Config(env).endpoint).toBeUndefined();
  });

  it('drops a trailing slash from the public URL', () => {
    expect(
      readS3Config({ ...ENV, S3_PUBLIC_URL: 'https://files.example.com/' })
        .publicUrl,
    ).toBe('https://files.example.com');
  });

  it('names every missing variable', () => {
    expect(() =>
      readS3Config({ ...ENV, S3_BUCKET: '', S3_SECRET_ACCESS_KEY: undefined }),
    ).toThrow(
      'File storage is not configured: missing S3_BUCKET, S3_SECRET_ACCESS_KEY',
    );
  });
});

/** Against s3rver, an in-process S3 emulator that serves its objects publicly by path. */
describe('S3FileStorage', () => {
  let server: S3rver;
  let directory: string;
  let config: S3Config;
  let storage: S3FileStorage;

  beforeAll(async () => {
    directory = mkdtempSync(join(tmpdir(), 's3rver-'));
    server = new S3rver({
      port: 0,
      address: '127.0.0.1',
      silent: true,
      directory,
    });
    const { port } = (await server.run()) as AddressInfo;
    const endpoint = `http://127.0.0.1:${port}`;
    config = {
      endpoint,
      region: 'auto',
      bucket: 'agendic',
      accessKeyId: 'S3RVER',
      secretAccessKey: 'S3RVER',
      publicUrl: `${endpoint}/agendic`,
    };
    const client = new S3Client({
      endpoint,
      region: config.region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    await client.send(new CreateBucketCommand({ Bucket: config.bucket }));
    client.destroy();
    storage = new S3FileStorage(config);
  });

  afterAll(async () => {
    await server.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('returns a public URL that serves the uploaded content', async () => {
    const content = new TextEncoder().encode('an image, trust me');

    const url = await storage.upload({ content, contentType: 'image/png' });

    expect(url.startsWith(`${config.publicUrl}/`)).toBe(true);
    const response = await fetch(url);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(content);
  });

  it('gives each upload its own URL', async () => {
    const file = { content: new Uint8Array([1]), contentType: 'image/png' };

    expect(await storage.upload(file)).not.toBe(await storage.upload(file));
  });

  it('stops serving a file once it is deleted by its URL', async () => {
    const url = await storage.upload({
      content: new Uint8Array([1, 2, 3]),
      contentType: 'image/jpeg',
    });

    await storage.delete(url);

    expect((await fetch(url)).status).toBe(404);
  });

  it('refuses to delete a URL it did not hand out', async () => {
    await expect(
      storage.delete('https://elsewhere.example.com/agendic/a.png'),
    ).rejects.toThrow('not a URL of this file storage');
  });
});
