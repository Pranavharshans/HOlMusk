import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';
import { randomUUID } from 'crypto';

// Disable Next.js body parsing
export const config = {
  api: {
    bodyParser: false,
  },
};

// Define accepted video types
const ACCEPTED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/mov',
  'video/x-m4v',
  'video/webm',
];

// Define maximum file size (200MB)
const MAX_FILE_SIZE_MB = 200;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Handles video upload POST requests
 */
export async function POST(request: NextRequest) {
  try {
    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'tmp', 'uploads');
    await fs.ensureDir(uploadDir);

    // Check if the request is multipart/form-data
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Content type must be multipart/form-data' },
        { status: 400 }
      );
    }

    // Get the form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only mp4, mov, and webm videos are accepted.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.` },
        { status: 400 }
      );
    }

    // Generate a unique filename
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const filename = `${uniqueSuffix}-${file.name}`;
    const filepath = path.join(uploadDir, filename);

    // Convert the file to a buffer and save it
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(filepath, buffer);

    // Return success response with file details
    const uploadId = randomUUID();
    
    return NextResponse.json({
      success: true,
      file: {
        name: file.name,
        size: file.size,
        path: filepath,
        type: file.type,
        uploadId,
      },
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'File upload failed: ' + (error.message || 'Unknown error') },
      { status: 500 }
    );
  }
} 