'use client'

import { useState } from 'react'

interface UploadResponse {
    success: boolean
    file: {
        id: string
        filename: string
        originalName: string
        url: string
        size: number
        mimeType: string
        bucket: string
        visibility: 'public' | 'private'
        folder: string
        uploadedAt: string
    }
}

export default function SimpleFileUpload() {
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [uploadedFile, setUploadedFile] = useState<UploadResponse['file'] | null>(null)
    const [error, setError] = useState<string | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            setFile(selectedFile)
            setError(null)
        }
    }

    const handleUpload = async () => {
        if (!file) {
            setError('Please select a file')
            return
        }

        setUploading(true)
        setError(null)

        try {
            const formData = new FormData()
            formData.append('file', file)

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            })

            const data = await response.json()

            if (data.success) {
                setUploadedFile(data.file)
                setFile(null)
                // Reset file input
                const fileInput = document.getElementById('file-input') as HTMLInputElement
                if (fileInput) fileInput.value = ''
            } else {
                setError(data.error || 'Upload failed')
            }
        } catch (err) {
            setError('Upload failed. Please try again.')
            console.error('Upload error:', err)
        } finally {
            setUploading(false)
        }
    }

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    return (
        <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Upload File</h2>

            <div className="space-y-4">
                {/* File Input */}
                <div>
                    <label htmlFor="file-input" className="block text-sm font-medium text-gray-700 mb-2">
                        Select File
                    </label>
                    <input
                        id="file-input"
                        type="file"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        disabled={uploading}
                    />
                </div>

                {/* File Info */}
                {file && (
                    <div className="p-3 bg-gray-50 rounded-md">
                        <p className="text-sm text-gray-600">
                            <strong>Name:</strong> {file.name}
                        </p>
                        <p className="text-sm text-gray-600">
                            <strong>Size:</strong> {formatFileSize(file.size)}
                        </p>
                        <p className="text-sm text-gray-600">
                            <strong>Type:</strong> {file.type || 'Unknown'}
                        </p>
                    </div>
                )}

                {/* Upload Button */}
                <button
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                    {uploading ? 'Uploading...' : 'Upload File'}
                </button>

                {/* Error Message */}
                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                {/* Success Message */}
                {uploadedFile && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                        <h3 className="text-lg font-semibold text-green-800 mb-2">Upload Successful!</h3>
                        <div className="space-y-1 text-sm text-green-700">
                            <p><strong>File:</strong> {uploadedFile.originalName}</p>
                            <p><strong>Size:</strong> {formatFileSize(uploadedFile.size)}</p>
                            <p><strong>Visibility:</strong> {uploadedFile.visibility}</p>
                            <p><strong>Folder:</strong> {uploadedFile.folder}</p>
                            <p><strong>URL:</strong>
                                <a
                                    href={uploadedFile.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline ml-1"
                                >
                                    View File
                                </a>
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
} 