"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  CloudArrowUpIcon, 
  DocumentTextIcon, 
  PlayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  ClipboardDocumentIcon,
  SunIcon,
  MoonIcon,
  SparklesIcon,
  EyeIcon,
  ClockIcon
} from '@heroicons/react/24/outline';



const ACCEPTED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/mov",
  "video/x-m4v",
  "video/webm",
];
const MAX_FILE_SIZE_MB = 200;

export default function Home() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadResponse, setUploadResponse] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [markdownNotes, setMarkdownNotes] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Calculate reading statistics
  const getReadingStats = (text: string) => {
    const wordCount = text.trim().split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200); // Average reading speed: 200 words per minute
    return { wordCount, readingTime };
  };

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

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileSelection = (file: File) => {
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
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      setUploadResponse(result);
      setUploadSuccess(true);
      
      // Start analysis
      setTimeout(() => {
        setIsAnalyzing(true);
        analyzeVideo(result);
      }, 500);

    } catch (err) {
      setError('Upload failed. Please try again.');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const analyzeVideo = async (uploadData: any) => {
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          uploadId: uploadData.uploadId,
          filePath: uploadData.filePath,
          mimeType: uploadData.mimeType
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const result = await response.json();
      setMarkdownNotes(result.notes);
    } catch (err) {
      setError(`Analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const downloadPDF = async () => {
    if (!markdownNotes) return;
    
    setIsDownloadingPDF(true);
    try {
      const response = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          markdown: markdownNotes,
          title: 'Video Analysis Report'
        }),
      });

      if (!response.ok) throw new Error('PDF generation failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Video_Analysis_Report.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('PDF download failed');
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const copyToClipboard = async () => {
    if (!markdownNotes) return;
    
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(markdownNotes);
      setTimeout(() => setIsCopying(false), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
      setIsCopying(false);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setUploadSuccess(false);
    setUploadProgress(0);
    setMarkdownNotes(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const stats = markdownNotes ? getReadingStats(markdownNotes) : null;

  return (
    <div className={`h-screen transition-all duration-500 flex flex-col overflow-hidden ${
      darkMode 
        ? 'bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900' 
        : 'bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50'
    }`}>
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-end items-center py-6">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleDarkMode}
              className={`p-3 rounded-xl transition-all ${
                darkMode 
                  ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' 
                  : 'bg-white text-gray-600 hover:bg-gray-50 shadow-lg'
              }`}
            >
              {darkMode ? (
                <SunIcon className="h-5 w-5" />
              ) : (
                <MoonIcon className="h-5 w-5" />
              )}
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 pb-12 flex-1 overflow-hidden">
        <div className="grid lg:grid-cols-5 gap-8 h-full">
          
          {/* Upload Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div className={`rounded-3xl p-8 shadow-2xl backdrop-blur-sm ${
              darkMode 
                ? 'bg-slate-800/50 border border-slate-700' 
                : 'bg-white/70 border border-white'
            }`}>
              
              {/* Hero Section */}
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 ${
                    darkMode ? 'bg-slate-600' : 'bg-blue-600'
                  }`}
                >
                  <EyeIcon className="h-8 w-8 text-white" />
                </motion.div>
                
                <h2 className={`text-3xl font-bold mb-2 ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Transform Videos into Insights
                </h2>
                <p className={`text-lg ${
                  darkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  Upload your video and get AI-powered analysis with detailed markdown notes
                </p>
              </div>

              {/* Upload Area */}
              <AnimatePresence mode="wait">
                {!selectedFile ? (
                  <motion.div
                    key="upload"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
                      dragActive
                        ? darkMode
                          ? 'border-slate-400 bg-slate-800/20'
                          : 'border-blue-400 bg-blue-50'
                        : darkMode
                          ? 'border-slate-600 hover:border-slate-400'
                          : 'border-gray-300 hover:border-blue-400'
                    }`}
                    onClick={() => inputRef.current?.click()}
                  >
                    <motion.div
                      animate={{ y: dragActive ? -5 : 0 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <CloudArrowUpIcon className={`h-16 w-16 mx-auto mb-4 ${
                        dragActive
                          ? darkMode ? 'text-slate-400' : 'text-blue-500'
                          : darkMode ? 'text-gray-400' : 'text-gray-400'
                      }`} />
                      
                      <h3 className={`text-xl font-semibold mb-2 ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {dragActive ? 'Drop your video here' : 'Upload your video'}
                      </h3>
                      
                      <p className={`mb-4 ${
                        darkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        Drag and drop or click to browse
                      </p>
                      
                      <div className="flex flex-wrap justify-center gap-2 text-xs">
                        {['MP4', 'AVI', 'MOV', 'WMV', 'WebM'].map((format) => (
                          <span
                            key={format}
                            className={`px-3 py-1 rounded-full ${
                              darkMode ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {format}
                          </span>
                        ))}
                      </div>
                      
                      <p className={`text-xs mt-2 ${
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        Maximum file size: 100MB
                      </p>
                    </motion.div>
                    
                    <input
                      ref={inputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleFileInput}
                      className="hidden"
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="file-selected"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={`rounded-2xl p-6 ${
                      darkMode ? 'bg-slate-700' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-xl ${
                        darkMode ? 'bg-slate-600' : 'bg-blue-600'
                      }`}>
                        <PlayIcon className="h-6 w-6 text-white" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${
                          darkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {selectedFile.name}
                        </p>
                        <p className={`text-sm ${
                          darkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                      
                      <button
                        onClick={resetUpload}
                        className={`p-2 rounded-lg transition-colors ${
                          darkMode 
                            ? 'hover:bg-slate-600 text-gray-400' 
                            : 'hover:bg-gray-200 text-gray-500'
                        }`}
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Upload Progress */}
              <AnimatePresence>
                {(isUploading || uploadSuccess) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-6"
                  >
                    <div className={`rounded-xl p-4 ${
                      darkMode ? 'bg-slate-700' : 'bg-gray-50'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${
                          darkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {isUploading ? 'Uploading...' : 'Upload Complete'}
                        </span>
                        <span className={`text-sm ${
                          darkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                          {uploadProgress}%
                        </span>
                      </div>
                      
                      <div className={`w-full rounded-full h-2 ${
                        darkMode ? 'bg-slate-600' : 'bg-gray-200'
                      }`}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${uploadProgress}%` }}
                          transition={{ duration: 0.3 }}
                          className={`h-2 rounded-full ${
                            uploadSuccess 
                              ? 'bg-green-500' 
                              : darkMode ? 'bg-slate-500' : 'bg-blue-500'
                          }`}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Buttons */}
              <div className="mt-8 space-y-4">
                {selectedFile && !uploadSuccess && (
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleUpload}
                    disabled={isUploading}
                    className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all shadow-lg ${
                      isUploading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : darkMode
                          ? 'bg-slate-600 hover:bg-slate-700 shadow-slate-500/25'
                          : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25'
                    }`}
                  >
                    {isUploading ? 'Uploading...' : 'Start Analysis'}
                  </motion.button>
                )}

                {uploadSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-center justify-center space-x-2 py-4 px-6 rounded-xl ${
                      darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600'
                    }`}
                  >
                    <CheckCircleIcon className="h-5 w-5" />
                    <span className="font-medium">Upload Successful</span>
                  </motion.div>
                )}
              </div>

              {/* Error Display */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`mt-4 p-4 rounded-xl flex items-center space-x-2 ${
                      darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'
                    }`}
                  >
                    <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Results Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-3 flex flex-col h-full"
          >
            <div className={`rounded-3xl p-8 shadow-2xl backdrop-blur-sm flex-1 flex flex-col overflow-hidden ${
              darkMode 
                ? 'bg-slate-800/50 border border-slate-700' 
                : 'bg-white/70 border border-white'
            }`}>
              
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-2xl font-bold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Notes
                </h3>
                
                {markdownNotes && (
                  <div className="flex space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={copyToClipboard}
                      className={`p-2 rounded-lg transition-colors ${
                        isCopying
                          ? 'bg-green-500 text-white'
                          : darkMode
                            ? 'bg-slate-700 hover:bg-slate-600 text-gray-300'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                      }`}
                      title="Copy to clipboard"
                    >
                      <ClipboardDocumentIcon className="h-5 w-5" />
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={downloadPDF}
                      disabled={isDownloadingPDF}
                      className={`p-2 rounded-lg transition-colors ${
                        darkMode
                          ? 'bg-slate-700 hover:bg-slate-600 text-gray-300'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                      }`}
                      title="Download PDF"
                    >
                      <ArrowDownTrayIcon className="h-5 w-5" />
                    </motion.button>
                  </div>
                )}
              </div>

              <AnimatePresence mode="wait">
                {isAnalyzing ? (
                  <motion.div
                    key="analyzing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-16"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className={`w-16 h-16 rounded-full border-4 border-t-transparent mb-6 ${
                        darkMode ? 'border-slate-500' : 'border-blue-500'
                      }`}
                    />
                    <h4 className={`text-xl font-semibold mb-2 ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Analyzing Video
                    </h4>
                    <p className={`text-center ${
                      darkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      Our AI is processing your video and generating detailed insights...
                    </p>
                  </motion.div>
                ) : markdownNotes ? (
                  <motion.div
                    key="results"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6 flex flex-col flex-1 overflow-hidden"
                  >
                    {/* Stats */}
                    {stats && (
                      <div className="grid grid-cols-2 gap-4 flex-shrink-0">
                        <div className={`p-4 rounded-xl ${
                          darkMode ? 'bg-slate-700' : 'bg-gray-50'
                        }`}>
                          <div className="flex items-center space-x-2">
                            <DocumentTextIcon className={`h-5 w-5 ${
                              darkMode ? 'text-slate-400' : 'text-blue-500'
                            }`} />
                            <span className={`text-sm font-medium ${
                              darkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {stats.wordCount} words
                            </span>
                          </div>
                        </div>
                        
                        <div className={`p-4 rounded-xl ${
                          darkMode ? 'bg-slate-700' : 'bg-gray-50'
                        }`}>
                          <div className="flex items-center space-x-2">
                            <ClockIcon className={`h-5 w-5 ${
                              darkMode ? 'text-slate-400' : 'text-blue-500'
                            }`} />
                            <span className={`text-sm font-medium ${
                              darkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {stats.readingTime} min read
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    <div className={`rounded-xl flex-1 overflow-hidden ${
                      darkMode ? 'bg-slate-700' : 'bg-gray-50'
                    }`}>
                      <div className={`h-full overflow-y-auto p-6`}>
                        <div className={`prose prose-sm max-w-none ${
                          darkMode 
                            ? 'prose-invert prose-headings:text-white prose-p:text-gray-300 prose-strong:text-white prose-code:text-blue-300 prose-blockquote:text-gray-300' 
                            : 'prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-code:text-blue-600 prose-blockquote:text-gray-600'
                        }`}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {markdownNotes}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-16"
                  >
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${
                      darkMode ? 'bg-slate-700' : 'bg-gray-100'
                    }`}>
                      <DocumentTextIcon className={`h-8 w-8 ${
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`} />
                    </div>
                    <h4 className={`text-xl font-semibold mb-2 ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Ready for Analysis
                    </h4>
                    <p className={`text-center ${
                      darkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      Upload a video to get started with AI-powered analysis
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
