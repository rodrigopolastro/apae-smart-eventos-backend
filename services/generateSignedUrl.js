import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({ region: 'us-east-1' }); // SDK pega credenciais automaticamente

async function generateSignedUrl(bucket, key) {
  const comando = new GetObjectCommand({ Bucket: bucket, Key: key });
  const url = await getSignedUrl(s3, comando, { expiresIn: 3600 });
  return url;
}

export { generateSignedUrl };
