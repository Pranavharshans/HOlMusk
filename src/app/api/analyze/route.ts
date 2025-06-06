import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';
import { 
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/files';

// Initialize the Google Generative AI SDK
const googleApiKey = process.env.GOOGLE_API_KEY || '';
if (!googleApiKey) {
  throw new Error('GOOGLE_API_KEY environment variable is not set.');
}
// Pass the API key string directly to the constructor
const genAI = new GoogleGenerativeAI(googleApiKey); 
const fileManager = new GoogleAIFileManager(googleApiKey);

const AWAIT_TIMEOUT_SECONDS = 300; // 5 minutes
const POLLING_INTERVAL_SECONDS = 5; // 5 seconds

async function pollFileProcessing(fileName: string): Promise<any> {
  let attempts = 0;
  const maxAttempts = AWAIT_TIMEOUT_SECONDS / POLLING_INTERVAL_SECONDS;

  while (attempts < maxAttempts) {
    try {
      const file = await fileManager.getFile(fileName);
      if (file.state === 'ACTIVE') {
        return file;
      }
      if (file.state === 'FAILED') {
        throw new Error(`File processing failed: ${fileName}`);
      }
    } catch (error) {
      console.warn(`Polling attempt ${attempts + 1} failed for ${fileName}:`, error);
      // Allow retries for transient errors, but fail fast for critical errors if needed
    }
    attempts++;
    await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_SECONDS * 1000));
  }
  throw new Error(`Timeout waiting for file processing: ${fileName}`);
}

export async function POST(request: NextRequest) {
  let localVideoPath: string | undefined;
  let uploadedFileGoogle: any | undefined;

  try {
    const body = await request.json();
    const { uploadId, filePath, mimeType: originalMimeType } = body;

    // ADDED: Detailed logging for incoming request parameters
    console.log('[ANALYZE API] Received body. Upload ID:', uploadId, 'File Path:', filePath, 'MIME Type:', originalMimeType);

    if (!uploadId || !filePath || !originalMimeType) {
      // ADDED: Log if parameters are missing
      console.error('[ANALYZE API] Error: Missing required parameters.', { uploadId, filePath, originalMimeType });
      return NextResponse.json(
        { error: 'Missing uploadId, filePath, or originalMimeType' },
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), 'tmp', 'uploads');
    localVideoPath = path.join(uploadDir, path.basename(filePath));

    if (!fs.existsSync(localVideoPath)) {
      return NextResponse.json(
        { error: 'Video file not found on server' },
        { status: 404 }
      );
    }

    // 1. Upload the file to Google File API
    console.log(`Uploading ${localVideoPath} to Google File API with mimeType: ${originalMimeType}`);
    const uploadResult = await fileManager.uploadFile(localVideoPath, {
      mimeType: originalMimeType,
      displayName: `video-upload-${uploadId}`,
    });
    uploadedFileGoogle = uploadResult.file;
    console.log(`Uploaded file to Google: ${uploadedFileGoogle.name}, state: ${uploadedFileGoogle.state}`);

    // 2. Poll for active state
    if (uploadedFileGoogle.state !== 'ACTIVE') {
      console.log(`File ${uploadedFileGoogle.name} is not active. Polling...`);
      uploadedFileGoogle = await pollFileProcessing(uploadedFileGoogle.name);
      console.log(`File ${uploadedFileGoogle.name} is now ACTIVE.`);
    }

    const prompt = `
    You are a professional educational note generator specializing in converting live lectures, online classes, and technical videos (including coding tutorials and academic content) into clean, structured, and deeply informative markdown notes.

You are trained to:

Extract subject matter with high precision.

Organize complex ideas clearly.

Deliver output suitable for university students, self-learners, or professionals reviewing dense material.

Task:
Analyze the video thoroughly and generate comprehensive, structured markdown notes. Your output must be precise, self-contained, and directly useful as study or reference material.

🔍 Include the following sections:
## Detailed Summary
Deliver a cohesive overview of the full video.

Explain key ideas, developments, or workflows clearly.

No filler or generalizations. Avoid phrases like “The video says” or “The speaker explains”.

## Key Topics and Concepts
Bullet points with clear, concise phrasing.

Cover all major ideas, terminology, methods, frameworks, or theories.

Where applicable, include definitions, formulas, code logic, and examples.

## Actionable Insights & Practical Takeaways
List knowledge that can be applied.

Include specific steps, best practices, or mental models.

## Further Exploration
Suggest topics, tools, readings, or questions to deepen understanding.

Link ideas to broader subjects when relevant.

## Timestamps & Highlights
List key timestamps in [mm:ss] format.

Each entry should briefly describe the point/event covered.

Only include timestamps for significant transitions or moments of insight.

Formatting Rules:
Use ## for main sections and ### for subpoints.

Use bullet points (-) or numbered lists where needed.

Emphasize using bold (for terms) and italics (for nuances).

Use > Blockquotes for exact definitions, formulas, or critical code patterns.

Do not include any introductory lines or unnecessary commentary.
      
    `;

    const generationConfig = {
      temperature: 0.7,
      topK: 1,
      topP: 1,
      maxOutputTokens: 8192,
      thinkingConfig: {
        thinkingBudget: 0, // Disable thinking to improve response speed
      },
    };

    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];
    
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-preview-04-17",
      generationConfig,
      safetySettings,
    });

    console.log(`Generating content for file: ${uploadedFileGoogle.displayName} (URI: ${uploadedFileGoogle.uri})`);
    const result = await model.generateContent([
      { fileData: { mimeType: uploadedFileGoogle.mimeType, fileUri: uploadedFileGoogle.uri } },
      { text: prompt },
    ]);

    const response = result.response;
    const markdown = response.text();

    return NextResponse.json({
      success: true,
      markdown,
      uploadId,
    });

  } catch (error: any) {
    console.error('Video analysis error:', error);
    let errorMessage = 'Failed to analyze video';
    if (error.message) {
      errorMessage += `: ${error.message}`;
    }
    if (error.cause) {
        errorMessage += `\nCause: ${JSON.stringify(error.cause)}`;
    }
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error.stack // Include stack for more detailed debugging if needed
      },
      { status: 500 }
    );
  } finally {
    // 3. Delete the file from Google File API
    if (uploadedFileGoogle && uploadedFileGoogle.name) {
      try {
        console.log(`Deleting file ${uploadedFileGoogle.name} from Google File API.`);
        await fileManager.deleteFile(uploadedFileGoogle.name);
        console.log(`Successfully deleted ${uploadedFileGoogle.name} from Google.`);
      } catch (deleteError: any) {
        console.error(`Failed to delete file ${uploadedFileGoogle.name} from Google:`, deleteError.message);
      }
    }
    // 4. Delete the local temporary file
    if (localVideoPath && fs.existsSync(localVideoPath)) {
      try {
        console.log(`Deleting local file ${localVideoPath}.`);
        await fs.unlink(localVideoPath);
        console.log(`Successfully deleted local file ${localVideoPath}.`);
      } catch (unlinkError: any) {
        console.error(`Failed to delete local file ${localVideoPath}:`, unlinkError.message);
      }
    }
  }
} 