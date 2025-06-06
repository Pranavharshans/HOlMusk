"use client";

import React, { useRef, useState, useEffect } from "react";
import { marked } from "marked";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// Configure marked to return string synchronously
marked.setOptions({
  async: false
});

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
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
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

  const downloadPDF = async () => {
    if (!markdownNotes) {
      setError("No notes to download");
      return;
    }

    if (isDownloadingPDF) {
      return; // Prevent multiple downloads
    }

    setIsDownloadingPDF(true);
    setError(null);

    try {
      // Get the prose content element
      const proseElement = document.querySelector('.prose');
      if (!proseElement) {
        throw new Error("Notes content not found");
      }

      const canvas = await html2canvas(proseElement as HTMLElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: darkMode ? '#18181b' : '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Calculate dimensions manually since we know the canvas size
      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // If content is taller than one page, add multiple pages
      let remainingHeight = pdfHeight;
      let yPosition = 0;
      
      while (remainingHeight > 0) {
        const pageHeight = Math.min(297, remainingHeight); // A4 height is 297mm
        
        pdf.addImage(
          imgData, 
          'PNG', 
          0, 
          -yPosition, 
          pdfWidth, 
          pdfHeight
        );
        
        remainingHeight -= 297;
        yPosition += 297;
        
        if (remainingHeight > 0) {
          pdf.addPage();
        }
      }
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `video-notes-${timestamp}.pdf`;
      
      pdf.save(filename);
    } catch (err: any) {
      setError(err.message || "Failed to download PDF");
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const copyMarkdown = async () => {
    if (!markdownNotes) {
      setError("No notes to copy");
      return;
    }

    if (isCopying) {
      return; // Prevent multiple operations
    }

    setIsCopying(true);
    setError(null);

    try {
      await navigator.clipboard.writeText(markdownNotes);
      // Brief visual feedback that copy succeeded
      setTimeout(() => setIsCopying(false), 1000);
    } catch (err: any) {
      setError(err.message || "Failed to copy markdown");
      setIsCopying(false);
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
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={downloadPDF}
                      disabled={isDownloadingPDF}
                      className={classNames(
                        "inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors",
                        isDownloadingPDF
                          ? "bg-gray-400 cursor-not-allowed text-white"
                          : darkMode 
                          ? "bg-green-600 hover:bg-green-700 text-white" 
                          : "bg-green-600 hover:bg-green-700 text-white"
                      )}
                    >
                      {isDownloadingPDF ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-5 h-5 mr-2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                          />
                        </svg>
                      )}
                      {isDownloadingPDF ? 'Generating PDF...' : 'Download PDF'}
                    </button>
                    <button
                      onClick={copyMarkdown}
                      disabled={isCopying}
                      className={classNames(
                        "inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors",
                        isCopying
                          ? "bg-gray-400 cursor-not-allowed text-white"
                          : darkMode 
                          ? "bg-blue-600 hover:bg-blue-700 text-white border border-blue-600" 
                          : "bg-white hover:bg-gray-50 text-blue-600 border border-blue-600"
                      )}
                    >
                      {isCopying ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-5 h-5 mr-2 text-green-500"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4.5 12.75l6 6 9-13.5"
                          />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-5 h-5 mr-2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-3a3.375 3.375 0 00-3.375 3.375v1.875m6.75-10.125a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm.75 12.75h-6a.75.75 0 01-.75-.75v-1.5a.75.75 0 01.75-.75h6a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75z"
                          />
                        </svg>
                      )}
                      {isCopying ? 'Copied!' : 'Copy Markdown'}
                    </button>
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
                </div>
                
                <div className={classNames(
                  "prose max-w-none",
                  darkMode ? "prose-invert prose-blue" : "prose-blue"
                )}>
                  <div dangerouslySetInnerHTML={{ __html: marked.parse(markdownNotes || '') as string }} />
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
