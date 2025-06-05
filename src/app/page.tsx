"use client";

import React, { useRef, useState, useEffect } from "react";
import { marked } from "marked";

const ACCEPTED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/mov",
  "video/x-m4v",
  "video/webm",
];
const MAX_FILE_SIZE_MB = 200;

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export default function Home() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [markdownNotes, setMarkdownNotes] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check system preference for dark mode on load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(isDarkMode);
    }
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateFile = (file: File) => {
    if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
      return "Unsupported file type. Please upload an mp4, mov, or webm video.";
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return `File is too large. Max size is ${MAX_FILE_SIZE_MB}MB.`;
    }
    return null;
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setSelectedFile(null);
      } else {
        setSelectedFile(file);
        setError(null);
        setUploadSuccess(false);
        setMarkdownNotes(null);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setSelectedFile(null);
      } else {
        setSelectedFile(file);
        setError(null);
        setUploadSuccess(false);
        setMarkdownNotes(null);
      }
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a file first");
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      setError(null);
      setMarkdownNotes(null);

      const formData = new FormData();
      formData.append("file", selectedFile);

      // Create a mock progress simulation
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const newProgress = prev + Math.random() * 10;
          return newProgress > 95 ? 95 : newProgress;
        });
      }, 500);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();
      setUploadProgress(100);
      setUploadSuccess(true);
      setUploadId(data.file.uploadId);

      // Start the analysis process using server-returned MIME type
      await analyzeVideo(data.file.uploadId, data.file.path, data.file.type);

      // Reset progress after a delay
      setTimeout(() => {
        setUploadProgress(0);
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Upload failed");
      setIsUploading(false);
    }
  };

  const analyzeVideo = async (uploadId: string, filePath: string, originalMimeType: string) => {
    if (!selectedFile) {
      setError("File information is missing for analysis.");
      setIsAnalyzing(false);
      setIsUploading(false);
      return;
    }
    try {
      setIsAnalyzing(true);
      
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uploadId,
          filePath,
          mimeType: originalMimeType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Analysis failed");
      }

      const data = await response.json();
      setMarkdownNotes(data.markdown);
    } catch (err: any) {
      setError(err.message || "Analysis failed");
    } finally {
      setIsAnalyzing(false);
      setIsUploading(false);
    }
  };

  return (
    <div className={classNames(
      "min-h-screen flex flex-col transition-colors duration-500",
      darkMode 
        ? "bg-gradient-to-br from-[#18181b] to-[#23272f] text-white" 
        : "bg-gradient-to-br from-[#f8fafc] to-[#e0e7ef] text-gray-900"
    )}>
      <header className="w-full p-4 flex justify-end">
        <button
          onClick={toggleDarkMode}
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          className={classNames(
            "p-2 rounded-full transition-colors",
            darkMode 
              ? "bg-gray-700 hover:bg-gray-600 text-yellow-300" 
              : "bg-gray-200 hover:bg-gray-300 text-gray-800"
          )}
        >
          {darkMode ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
            </svg>
          )}
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
          <h1 className={classNames(
            "text-4xl sm:text-5xl font-extrabold tracking-tight mb-2 drop-shadow-lg text-center",
            darkMode ? "text-white" : "text-gray-900"
          )}>
            Videnote
          </h1>
          <p className={classNames(
            "text-lg sm:text-xl mb-8 font-medium text-center max-w-md",
            darkMode ? "text-gray-300" : "text-gray-600"
          )}>
            Instantly turn your videos into beautiful, structured markdown notes with AI.
          </p>
          
          {!markdownNotes ? (
            <div
              className={classNames(
                "w-full rounded-2xl shadow-xl border p-4 sm:p-8 flex flex-col items-center transition-colors duration-300",
                darkMode 
                  ? "border-gray-700 bg-[#18181b]" 
                  : "border-gray-200 bg-white",
                dragActive 
                  ? darkMode ? "ring-2 ring-blue-400 bg-[#23272f]" : "ring-2 ring-blue-400 bg-blue-50" 
                  : "",
                !selectedFile ? "cursor-pointer hover:shadow-2xl" : ""
              )}
              onDragEnter={selectedFile ? undefined : handleDrag}
              onDragOver={selectedFile ? undefined : handleDrag}
              onDragLeave={selectedFile ? undefined : handleDrag}
              onDrop={selectedFile ? undefined : handleDrop}
              onClick={selectedFile ? undefined : handleClick}
              role={!selectedFile ? "button" : "region"}
              aria-label={!selectedFile ? "Click or drag to upload video" : "Video upload area"}
              tabIndex={!selectedFile ? 0 : undefined}
            >
              <input
                type="file"
                accept="video/mp4,video/quicktime,video/mov,video/x-m4v,video/webm"
                className="hidden"
                ref={inputRef}
                onChange={handleChange}
                aria-label="Upload video file"
              />
              
              {!selectedFile ? (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-14 h-14 text-blue-500 mb-4"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5M4.5 10.5h15m-1.5 0v7.125A2.625 2.625 0 0115.375 20.25H8.625A2.625 2.625 0 016 17.625V10.5"
                    />
                  </svg>
                  <p className={classNames(
                    "text-lg font-semibold mb-1",
                    darkMode ? "text-gray-100" : "text-gray-800"
                  )}>
                    Drag & drop your video here, or{" "}
                    <span className={classNames(
                      "underline",
                      darkMode ? "text-blue-400" : "text-blue-600"
                    )}>browse</span>
                  </p>
                  <p className={classNames(
                    "text-sm mb-4",
                    darkMode ? "text-gray-400" : "text-gray-500"
                  )}>
                    Supported: mp4, mov, webm. Max size: {MAX_FILE_SIZE_MB}MB.
                  </p>
                </>
              ) : (
                <div className="w-full">
                  <div className="flex items-center mb-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-8 h-8 text-blue-500 mr-3 flex-shrink-0"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75H5.625m0-12.75h12.75m-12.75 0v1.5c0 .621.504 1.125 1.125 1.125M19.125 4.5h-1.5a1.125 1.125 0 00-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0h1.5"
                      />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className={classNames(
                        "text-md font-medium truncate",
                        darkMode ? "text-gray-100" : "text-gray-800"
                      )}>
                        {selectedFile.name}
                      </p>
                      <p className={classNames(
                        "text-xs",
                        darkMode ? "text-gray-400" : "text-gray-500"
                      )}>
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setUploadSuccess(false);
                        setUploadId(null);
                        setMarkdownNotes(null);
                      }}
                      className={classNames(
                        "flex-shrink-0",
                        darkMode 
                          ? "text-gray-400 hover:text-gray-200" 
                          : "text-gray-500 hover:text-gray-700"
                      )}
                      aria-label="Remove selected file"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  {uploadProgress > 0 && (
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4" role="progressbar" aria-valuenow={uploadProgress} aria-valuemin={0} aria-valuemax={100}>
                      <div
                        className={`h-2 rounded-full ${
                          uploadSuccess
                            ? "bg-green-500"
                            : "bg-blue-500"
                        }`}
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  )}

                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={handleUpload}
                      disabled={isUploading || uploadSuccess || isAnalyzing}
                      className={classNames(
                        "px-4 py-2 rounded-lg text-white font-medium transition-colors",
                        isUploading || isAnalyzing
                          ? "bg-blue-400 cursor-not-allowed"
                          : uploadSuccess
                          ? "bg-green-500 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700"
                      )}
                      aria-busy={isUploading || isAnalyzing}
                    >
                      {isUploading
                        ? "Uploading..."
                        : isAnalyzing
                        ? "Analyzing Video..."
                        : uploadSuccess
                        ? "Uploaded Successfully"
                        : "Upload Video"}
                    </button>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="mt-4 text-red-600 dark:text-red-400 font-semibold text-center" role="alert">
                  {error}
                </div>
              )}
              
              {uploadSuccess && !isAnalyzing && !markdownNotes && (
                <div className="mt-4 text-green-600 dark:text-green-400 font-semibold text-center" aria-live="polite">
                  Video uploaded successfully! Analyzing content...
                </div>
              )}
              
              {isAnalyzing && (
                <div className="mt-4 flex items-center justify-center" aria-live="polite">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-2" aria-hidden="true"></div>
                  <span className={classNames(
                    darkMode ? "text-blue-400" : "text-blue-600"
                  )}>Analyzing video with AI...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full space-y-6">
              <div className={classNames(
                "rounded-2xl shadow-xl border p-4 sm:p-8",
                darkMode 
                  ? "border-gray-700 bg-[#18181b]" 
                  : "border-gray-200 bg-white"
              )}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                  <h2 className={classNames(
                    "text-2xl font-bold",
                    darkMode ? "text-gray-100" : "text-gray-800"
                  )}>
                    Video Analysis Results
                  </h2>
                  <button
                    onClick={() => {
                      setMarkdownNotes(null);
                      setSelectedFile(null);
                      setUploadSuccess(false);
                      setUploadId(null);
                    }}
                    className={classNames(
                      "hover:underline font-medium",
                      darkMode ? "text-blue-400" : "text-blue-600"
                    )}
                  >
                    Analyze Another Video
                  </button>
                </div>
                
                {/* Static Test Block */}
                <article className={classNames("prose lg:prose-xl mb-4", darkMode ? "prose-invert" : "")}>
                  <h1>Test Static Heading</h1>
                  <p>This is a static paragraph. It should be styled by Tailwind Typography.</p>
                  <ul>
                    <li>Static list item 1</li>
                    <li>Static list item 2</li>
                  </ul>
                  <p><code>This is some static inline code.</code></p>
                  <pre><code>// This is a static code block
const greeting = "Hello, world!";
console.log(greeting);</code></pre>
                </article>
                <hr className={classNames("my-6", darkMode ? "border-gray-700" : "border-gray-300")} />
                {/* End Static Test Block */}

                <div className={classNames(
                  "prose max-w-none",
                  darkMode ? "prose-invert prose-blue" : "prose-blue"
                )}>
                  <div dangerouslySetInnerHTML={{ __html: marked(markdownNotes || '') }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className={classNames(
        "w-full p-4 text-center text-sm",
        darkMode ? "text-gray-400" : "text-gray-500"
      )}>
        <p>© {new Date().getFullYear()} Videnote. Powered by Gemini 2.5 and Next.js</p>
      </footer>
    </div>
  );
}
