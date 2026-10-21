import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';
import { getUserBySessionToken, parseCookie } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getCloudinaryCredentials() {
  let cloudName = (process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '').trim();
  let apiKey = (process.env.CLOUDINARY_API_KEY || '').trim();
  let apiSecret = (process.env.CLOUDINARY_API_SECRET || '').trim();

  const cloudinaryUrl = (process.env.CLOUDINARY_URL || '').trim();
  if ((!cloudName || !apiKey || !apiSecret) && cloudinaryUrl) {
    try {
      const parsed = new URL(cloudinaryUrl);
      cloudName = cloudName || parsed.hostname;
      apiKey = apiKey || decodeURIComponent(parsed.username);
      apiSecret = apiSecret || decodeURIComponent(parsed.password);
    } catch (urlErr) {
      console.warn('[Product Image Upload] Failed to parse CLOUDINARY_URL:', urlErr);
    }
  }

  return { cloudName, apiKey, apiSecret };
}

function isPlaceholderOrEmpty(val: string) {
  return !val || val.toLowerCase().includes('your_cloudinary') || val.toLowerCase().includes('placeholder');
}

async function requireAdmin(request: Request) {
  try {
    const token = parseCookie(request.headers.get('cookie'), 'wf_session');
    if (!token) return null;

    const user = await getUserBySessionToken(token);
    if (!user || user.role !== 'admin') return null;
    return user;
  } catch (error) {
    console.error('[Product Image Upload] Admin authentication check failed:', error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cloudName, apiKey, apiSecret } = getCloudinaryCredentials();

    if (isPlaceholderOrEmpty(cloudName) || isPlaceholderOrEmpty(apiKey) || isPlaceholderOrEmpty(apiSecret)) {
      const missingKeys: string[] = [];
      if (isPlaceholderOrEmpty(cloudName)) missingKeys.push('CLOUDINARY_CLOUD_NAME');
      if (isPlaceholderOrEmpty(apiKey)) missingKeys.push('CLOUDINARY_API_KEY');
      if (isPlaceholderOrEmpty(apiSecret)) missingKeys.push('CLOUDINARY_API_SECRET');

      const message = `Cloudinary is not configured. Missing or placeholder credentials: ${missingKeys.join(', ')}. Please set them in your hosting environment variables (e.g. Vercel dashboard) or .env.local.`;
      console.error(`[Product Image Upload] ${message}`);

      return Response.json(
        {
          error: message,
          missingKeys,
        },
        { status: 500 }
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return Response.json({ error: 'Invalid file type. Please upload an image.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const inputBuffer = Buffer.from(bytes);

    // Try converting upload to WebP using sharp; if sharp fails (e.g. unsupported format or memory), fallback to original buffer.
    let bufferToUpload: Buffer = inputBuffer;
    let format = 'webp';
    try {
      bufferToUpload = await sharp(inputBuffer)
        .rotate()
        .webp({ quality: 84 })
        .toBuffer();
    } catch (sharpError) {
      console.warn('[Product Image Upload] Sharp conversion failed, uploading original buffer directly:', sharpError);
      bufferToUpload = inputBuffer;
      format = 'auto';
    }

    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const uploadOptions: Record<string, unknown> = {
        folder: 'veracuttinglinks/products',
        resource_type: 'image',
      };
      if (format !== 'auto') {
        uploadOptions.format = format;
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, uploaded) => {
          if (error || !uploaded?.secure_url) {
            console.error('[Product Image Upload] Cloudinary uploadStream error:', error);
            reject(error || new Error('Upload failed - no secure_url returned by Cloudinary'));
            return;
          }

          resolve({ secure_url: uploaded.secure_url });
        }
      );

      uploadStream.end(bufferToUpload);
    });

    return Response.json({ url: result.secure_url }, { status: 201 });
  } catch (error) {
    console.error('[Product Image Upload] Error handling request:', error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Failed to upload image',
        details: error instanceof Error ? error.stack || error.message : String(error),
      },
      { status: 500 }
    );
  }
}

