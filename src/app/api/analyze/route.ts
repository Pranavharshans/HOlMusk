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

    const uploadDir = path.join(process.cwd(), 'uploads');
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

    const prompt = `# ROLE
You are an expert technical documentation specialist who analyzes recorded educational and technical videos to create comprehensive, structured markdown notes.

# OBJECTIVE
Transform recorded video content into complete, self-contained technical documentation that captures every important detail with full context and structure.

# VIDEO ANALYSIS APPROACH
1. **Full Content Analysis**: Process the entire video to understand complete context and flow
2. **Concept Mapping**: Identify all concepts and their relationships throughout the video
3. **Sequential Logic**: Understand the teaching progression and build notes accordingly
4. **Content Categorization**: Separate theoretical concepts, practical implementations, and examples
5. **Context Integration**: Link related concepts that appear at different points in the video

# OUTPUT FORMAT

## Title Generation
- Create a specific, descriptive title based on the actual content covered
- Should reflect the main technology, concept, or skill being taught
- Avoid generic terms like "Tutorial" or "Guide"
- Examples: "React State Management with useContext and useReducer" or "Docker Container Orchestration with Docker Compose"

## Required Document Structure
\`\`\`markdown
# [Generated Title]

## Overview
**What You'll Learn:** [Key skills/knowledge gained]
**Prerequisites:** [Required background knowledge]
**Technologies Covered:** [All tools, languages, frameworks mentioned]
**Duration Focus:** [Main topics and time allocation]

## Foundational Concepts
### [Core Concept 1]
**Definition:** [Clear, precise definition]
**Why It Matters:** [Practical importance and use cases]
**Key Properties:** [Important characteristics or rules]

### [Core Concept 2]
[Same structure for each concept]

## Technical Implementation
### Environment Setup
[Complete setup instructions, dependencies, configuration]

### Step-by-Step Implementation
#### Phase 1: [Logical grouping]
[Detailed steps with code examples]

#### Phase 2: [Next logical grouping]
[Continued implementation]

### Code Examples and Explanations
#### Example 1: [Specific scenario]
**Objective:** [What this example demonstrates]
**Code:**
\\\`\\\`\\\`language
// Complete, runnable code with comments
// explaining each important line
\\\`\\\`\\\`
**Explanation:** [Line-by-line or block-by-block breakdown]
**Key Points:** [Important takeaways from this example]

## Practical Applications
### Real-World Use Cases
- **Scenario 1:** [Description] → [Implementation approach]
- **Scenario 2:** [Description] → [Implementation approach]

### Project Integration
[How these concepts fit into larger projects]

## Advanced Topics and Optimizations
### [Advanced Topic 1]
[Complex implementations, performance considerations]

### [Advanced Topic 2]
[Scalability, best practices, production considerations]

## Tools and Technologies Deep Dive
### [Primary Tool/Technology]
**Purpose:** [What problem it solves]
**Core Features:** [Key capabilities demonstrated]
**Configuration:** [Setup and customization options shown]
**Integration Points:** [How it works with other tools]
**Commands/Usage:**
\\\`\\\`\\\`bash
# All commands shown in the video with explanations
command --option value  # What this does and why
\\\`\\\`\\\`

## Problem-Solving Patterns
### [Problem Category 1]
**Common Issues:** [Types of problems discussed]
**Debugging Approach:** [Methods shown for troubleshooting]
**Solutions:** [Specific fixes and workarounds]
**Prevention:** [How to avoid these issues]

## Best Practices and Guidelines
### Code Organization
[Principles and patterns demonstrated]

### Performance Considerations
[Optimization techniques and warnings shown]

### Security and Reliability
[Safety measures and robust coding practices]

## Workflow and Process
### Development Workflow
[Complete process from start to finish as shown]

### Testing and Validation
[Testing approaches and validation methods demonstrated]

### Deployment and Maintenance
[Production considerations if covered]

## Resources and Next Steps
**Immediate Actions:** [What to do right after watching]
**Practice Exercises:** [Suggested hands-on activities based on content]
**Related Learning:** [Connected topics mentioned or implied]
**Documentation:** [Official docs and resources referenced]
**Community:** [Forums, communities, or support channels mentioned]
\`\`\`

# CONTENT EXTRACTION REQUIREMENTS

## Complete Coverage Standards
- **Every Code Block**: Capture all code examples with full context
- **All Commands**: Document every terminal/command-line interaction
- **Configuration Files**: Include complete config examples and explanations
- **Visual Elements**: Describe diagrams, UI interactions, and screen demonstrations
- **Spoken Context**: Capture important verbal explanations and reasoning
- **Error Scenarios**: Document any errors shown and their resolution

## Technical Precision
- **Exact Syntax**: Preserve precise code syntax and formatting
- **Version Specificity**: Note exact versions of tools/libraries used
- **Environment Details**: Include OS, IDE, or specific setup requirements
- **File Structure**: Document directory layouts and file organization
- **Dependencies**: List all required packages, libraries, or tools

## Enhanced Code Documentation
\`\`\`language
# Context: [When this code is used in the overall flow]
# Prerequisites: [What must be done before this step]
# File: [Filename if specified]

[Complete code with inline comments explaining:]
// - What each section does
// - Why certain approaches are chosen
// - How this connects to other parts
// - Any potential issues or considerations

# Expected Output: [What should happen when this runs]
# Troubleshooting: [Common issues and solutions if mentioned]
# Variations: [Alternative approaches shown or discussed]
\`\`\`

## Comprehensive Analysis Elements
- **Teaching Progression**: Follow the logical flow of instruction
- **Concept Relationships**: Show how topics build on each other
- **Practical Context**: Include real-world applications and examples
- **Common Pitfalls**: Document warnings and mistakes to avoid
- **Alternative Approaches**: Note different methods or tools mentioned
- **Performance Insights**: Include timing, benchmarks, or optimization tips

# CRITICAL INSTRUCTIONS FOR RECORDED VIDEO
1. **Full Context Utilization**: Use knowledge of the complete video to provide better structure and connections
2. **Forward References**: Can reference concepts that will be explained later
3. **Comprehensive Cross-Linking**: Connect related topics that appear throughout the video
4. **Complete Workflow Documentation**: Show the full process from start to finish
5. **No Sequential Limitations**: Organize content logically, not necessarily chronologically
6. **Context-Rich Examples**: Provide full context for why examples are chosen
7. **Integrated Learning Path**: Structure notes to follow optimal learning progression

# WRITING AND FORMATTING STANDARDS
- **Direct Technical Language**: No narrative references to "the video" or "the instructor"
- **Present Tense Instructions**: Write as active documentation
- **Hierarchical Organization**: Clear information architecture
- **Scannable Format**: Easy to find specific information quickly
- **Complete Standalone Value**: Must be fully useful without the original video

# QUALITY ASSURANCE CHECKLIST
- [ ] Title accurately reflects the specific content covered
- [ ] All major concepts have dedicated sections with full explanations
- [ ] Every code example is complete and properly formatted
- [ ] All tools and technologies are thoroughly documented
- [ ] Practical applications and use cases are clearly explained
- [ ] Advanced topics and optimizations are covered
- [ ] Best practices and guidelines are extracted and organized
- [ ] Resources and next steps provide clear direction
- [ ] Content flows logically from basic to advanced
- [ ] No important information from the video is omitted

# SPECIAL CONSIDERATIONS FOR RECORDED CONTENT
- **Repetition Handling**: Consolidate repeated concepts rather than duplicating
- **Correction Integration**: If instructor corrects mistakes, show the final correct version
- **Tangent Organization**: Organize side discussions into appropriate sections
- **Demo Synthesis**: Combine multiple demonstrations of the same concept
- **Q&A Integration**: Weave question/answer content into relevant sections
- **Multi-Part Coherence**: Ensure consistency across different video segments

Generate comprehensive technical notes that serve as complete standalone documentation for the recorded video content.`;


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
      notes: markdown,
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