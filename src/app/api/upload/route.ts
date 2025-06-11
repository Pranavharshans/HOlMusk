import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Disable Next.js body parsing
export const config = {
  api: {
    bodyParser: false,
  },
};

// Define accepted video types
const ACCEPTED_VIDEO_TYPES = [
  'video/mp4',
  'video/avi',
  'video/mov',
  'video/wmv',
  'video/webm',
];

// Define maximum file size (100MB)
const MAX_FILE_SIZE_MB = 100;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Handles video upload POST requests
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' });
    }

    // Validate file type
    const allowedTypes = [
      'video/mp4',
      'video/avi', 
      'video/quicktime',
      'video/x-msvideo',
      'video/webm'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid file type. Please upload MP4, AVI, MOV, WMV, or WebM files.' 
      });
    }

    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        success: false, 
        error: 'File too large. Maximum size is 100MB.' 
      });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const uploadId = uuidv4();
    const fileExtension = path.extname(file.name);
    const fileName = `${uploadId}${fileExtension}`;
    const filePath = path.join(uploadDir, fileName);

    // Save file
    await writeFile(filePath, buffer);

    return NextResponse.json({ 
      success: true, 
      uploadId,
      fileName,
      filePath: fileName, // Relative path for the analyze endpoint
      mimeType: file.type,
      originalName: file.name,
      size: file.size
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Upload failed' 
    }, { status: 500 });
  }
} 