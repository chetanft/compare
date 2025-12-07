import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { CloudArrowUpIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onFileRemove: () => void;
  accept?: string;
  maxSize?: number;
  title: string;
  description: string;
  className?: string;
}

export default function FileUploadZone({
  onFileSelect,
  selectedFile,
  onFileRemove,
  accept = 'image/jpeg,image/png,image/webp',
  maxSize = 10 * 1024 * 1024, // 10MB
  title,
  description,
  className = ''
}: FileUploadZoneProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      console.log('📁 FileUploadZone: File selected:', {
        name: file.name,
        type: file.type,
        size: file.size,
        isFile: file instanceof File,
        constructor: file.constructor.name,
        file: file
      });
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp']
    },
    maxFiles: 1,
    maxSize,
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const hasError = fileRejections.length > 0;

  return (
    <div className={`w-full flex flex-col ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {title}
      </label>
      
      {!selectedFile ? (
        <motion.div
          {...getRootProps()}
          className={`
            upload-zone cursor-pointer transition-colors duration-200
            border-2 border-dashed rounded-lg p-8 flex-1
            flex flex-col items-center justify-center min-h-[200px]
            ${isDragActive ? 'upload-zone-active border-primary-500 bg-primary-50' : 'border-gray-300 bg-gray-50'}
            ${hasError ? 'border-red-400 bg-red-50' : ''}
          `}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center text-center">
            <CloudArrowUpIcon className={`w-12 h-12 mb-4 ${hasError ? 'text-red-400' : 'text-gray-400'}`} />
            <p className={`text-lg font-medium mb-2 ${hasError ? 'text-red-600' : 'text-gray-900'}`}>
              {isDragActive ? 'Drop the image here' : 'Upload Screenshot'}
            </p>
            <p className={`text-sm text-center ${hasError ? 'text-red-500' : 'text-muted-foreground'}`}>
              {description}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Supported formats: JPG, PNG, WebP (Max: {formatFileSize(maxSize)})
            </p>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="image-preview relative border-2 border-gray-300 rounded-lg p-2 bg-gray-50"
        >
          <img
            src={URL.createObjectURL(selectedFile)}
            alt="Preview"
            className="w-full h-48 object-cover rounded-md"
          />
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFileRemove();
              }}
              className="bg-red-500 hover:bg-red-600 text-white rounded-full p-2 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <PhotoIcon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{selectedFile.name}</span>
            </div>
            <span className="text-xs text-gray-400">
              {formatFileSize(selectedFile.size)}
            </span>
          </div>
        </motion.div>
      )}

      {hasError && (
        <div className="mt-2">
          {fileRejections.map(({ file, errors }) => (
            <div key={file.name} className="text-sm text-red-600">
              {errors.map(error => (
                <p key={error.code}>
                  {error.code === 'file-too-large' 
                    ? `File too large. Maximum size is ${formatFileSize(maxSize)}`
                    : error.code === 'file-invalid-type'
                    ? 'Invalid file type. Please use JPG, PNG, or WebP'
                    : error.message
                  }
                </p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
