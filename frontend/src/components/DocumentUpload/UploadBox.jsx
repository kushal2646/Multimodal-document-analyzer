import React, { useState, useRef } from 'react';
import { UploadCloud, File, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

const UploadBox = ({ onUploadSuccess, onCancel }) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    setError(null);
    setSuccess(false);
    setProgress(0);
    
    // Check file size (15MB)
    const maxSize = 15 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError("File size exceeds 15MB limit.");
      return;
    }
    
    // Check extensions
    const supportedExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.docx', '.txt'];
    const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
    
    if (!supportedExtensions.includes(fileExtension)) {
      setError("Unsupported format. Please upload PDF, PNG, JPG, JPEG, DOCX, or TXT.");
      return;
    }
    
    setFile(selectedFile);
  };

  const triggerInput = () => {
    inputRef.current.click();
  };

  const handleUploadSubmit = async () => {
    if (!file) return;
    
    setUploading(true);
    setError(null);
    
    try {
      const { documentService } = await import('../../services/api');
      const response = await documentService.upload(file, (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setProgress(percentCompleted);
      });
      
      setSuccess(true);
      setTimeout(() => {
        onUploadSuccess(response._id);
      }, 1000);
    } catch (e) {
      console.error(e);
      setError(e.response?.data?.detail || "Upload failed. Verify server connection.");
      setUploading(false);
    }
  };

  return (
    <div className="max-w-xl w-full p-8 rounded-2xl glass-panel dark:glass-panel dark:bg-darkPanel/50 border border-slate-200 dark:border-slate-800 text-center select-none shadow-2xl">
      <h2 className="font-display font-bold text-2xl mb-2 text-slate-800 dark:text-slate-100">
        Upload Document
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Ingest invoices, notes, research papers, resumes or screenshots.
      </p>

      {/* Drop Zone Box */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={!uploading ? triggerInput : undefined}
        className={`border-2 border-dashed rounded-xl p-8 cursor-pointer transition flex flex-col items-center justify-center min-h-60 ${
          dragActive 
            ? "border-indigo-500 bg-indigo-500/5" 
            : "border-slate-300 dark:border-slate-700 hover:border-indigo-500/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/10"
        } ${uploading ? "pointer-events-none" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleChange}
          accept=".pdf,.png,.jpg,.jpeg,.docx,.txt"
        />
        
        {success ? (
          <div className="flex flex-col items-center space-y-3 text-emerald-500">
            <CheckCircle2 className="h-16 w-16 animate-bounce" />
            <span className="font-semibold text-lg">Ingestion Successful!</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Triggering AI engine...</span>
          </div>
        ) : uploading ? (
          <div className="flex flex-col items-center space-y-4 w-full px-6">
            <Loader2 className="h-12 w-12 text-indigo-500 animate-spin" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Uploading: {progress}%
            </span>
            <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        ) : file ? (
          <div className="flex flex-col items-center space-y-3">
            <File className="h-16 w-16 text-indigo-500" />
            <div className="flex flex-col">
              <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-sm">
                {file.name}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
              }}
              className="text-xs text-rose-500 hover:underline"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-3">
            <div className="bg-indigo-500/10 p-4 rounded-full text-indigo-500">
              <UploadCloud className="h-10 w-10 animate-pulse" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Drag & Drop file here, or click to browse
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Supports: PDF, PNG, JPG, JPEG, DOCX, TXT (Max 15MB)
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 flex items-center space-x-2 text-rose-500 justify-center text-sm bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Controls */}
      <div className="mt-6 flex items-center justify-end space-x-3">
        <button
          onClick={onCancel}
          disabled={uploading}
          className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
        >
          Cancel
        </button>
        <button
          onClick={handleUploadSubmit}
          disabled={!file || uploading}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition cursor-pointer"
        >
          Analyze Document
        </button>
      </div>
    </div>
  );
};

export default UploadBox;
