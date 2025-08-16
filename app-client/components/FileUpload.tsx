'use client'

import { useRef } from 'react'
import { useFileUpload } from '@/hooks/useFileUpload'

interface UploadedFile {
    id: string
    filename: string
    originalName: string
    url: string
    size: number
    mimeType: string
    uploadedAt: string
}

interface FileUploadProps {
    onUploadComplete?: (file: UploadedFile) => void
    accept?: string
    maxSize?: number // in bytes
    multiple?: boolean
}

export default function FileUpload({
    onUploadComplete,
    accept = '*/*',
    maxSize = 10 * 1024 * 1024, // 10MB default
    multiple = false,
}: FileUploadProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)

    const {
        uploading,
        progress,
        error,
        uploadFile,
        uploadMultipleFiles,
        clearError
    } = useFileUpload({
        maxSize,
        onSuccess: onUploadComplete,
        onError: (error) => console.error('Upload error:', error)
    })

    const handleFileSelect = async (files: FileList | null) => {
        if (!files) return

        if (multiple) {
            await uploadMultipleFiles(Array.from(files))
        } else {
            await uploadFile(files[0])
        }

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        handleFileSelect(e.dataTransfer.files)
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
    }

    return (
        <div className="w-full max-w-md mx-auto">
            <div
                className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${uploading ? 'opacity-50 pointer-events-none' : 'hover:border-blue-400'}
          border-gray-300
        `}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={accept}
                    multiple={multiple}
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files)}
                    disabled={uploading}
                />

                {uploading ? (
                    <div className="flex flex-col items-center">
                        <div className="relative w-16 h-16 mb-4">
                            <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
                            <div
                                className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent"
                                style={{
                                    transform: `rotate(${progress * 3.6}deg)`
                                }}
                            ></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-sm font-medium">{progress}%</span>
                            </div>
                        </div>
                        <p className="text-gray-600">Uploading...</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center">
                        <svg
                            className="h-12 w-12 text-gray-400 mb-4"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-gray-600 mb-2">
                            {multiple ? 'Drop files here or click to select' : 'Drop file here or click to select'}
                        </p>
                        <p className="text-sm text-gray-400">
                            Max size: {(maxSize / 1024 / 1024).toFixed(1)}MB
                        </p>
                    </div>
                )}
            </div>

            {error && (
                <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex justify-between items-center">
                    <span>{error}</span>
                    <button
                        onClick={clearError}
                        className="text-red-800 hover:text-red-900 underline text-sm"
                    >
                        Dismiss
                    </button>
                </div>
            )}
        </div>
    )
}