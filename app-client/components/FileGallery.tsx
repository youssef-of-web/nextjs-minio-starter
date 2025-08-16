'use client'
import Image from 'next/image'
import { useFiles } from '@/hooks/useFiles'
import { useFileUtils } from '@/hooks/useFileUtils'

interface FileGalleryProps {
    refreshTrigger?: number
}

export default function FileGallery({ refreshTrigger }: FileGalleryProps) {
    const {
        files,
        loading,
        error,
        useTemporaryUrls,
        deleteFile,
        generateTemporaryUrl,
        toggleTemporaryUrls,
        clearError
    } = useFiles({ refreshTrigger })

    const {
        formatFileSize,
        isImage,
        formatDate
    } = useFileUtils()

    if (loading) {
        return (
            <div className="flex justify-center items-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
                <button
                    onClick={clearError}
                    className="ml-2 text-red-800 hover:text-red-900 underline"
                >
                    Dismiss
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex space-x-4">
                    <div>
                        <h3 className="text-sm font-medium text-gray-700">URL Type</h3>
                        <p className="text-xs text-gray-500">
                            {useTemporaryUrls
                                ? 'Using temporary URLs (15 min expiry) for private files'
                                : 'Using permanent URLs'
                            }
                        </p>
                    </div>
                    <button
                        onClick={toggleTemporaryUrls}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${useTemporaryUrls
                            ? 'bg-orange-500 text-white hover:bg-orange-600'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                    >
                        {useTemporaryUrls ? 'Use Permanent URLs' : 'Use Temporary URLs'}
                    </button>
                </div>
            </div>

            {files.length === 0 ? (
                <div className="text-center p-8 text-gray-500">
                    No files uploaded yet. Upload your first file above!
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file, index) => (
                        <div key={index} className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="font-medium text-sm truncate pr-2">{file.originalName}</h3>
                                <div className="flex space-x-1">
                                    {file.visibility === 'private' && (
                                        <button
                                            onClick={() => generateTemporaryUrl(file.id)}
                                            className="text-blue-500 hover:text-blue-700 p-1"
                                            title="Generate temporary URL"
                                        >
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                        </button>
                                    )}
                                    <button
                                        onClick={() => deleteFile(file.id)}
                                        className="text-red-500 hover:text-red-700 p-1"
                                        title="Delete file"
                                    >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {isImage(file.mimeType) && file.url ? (
                                <div className="relative w-full h-32 mb-3 bg-gray-100 rounded">
                                    <Image
                                        src={file.url}
                                        alt={file.originalName}
                                        fill
                                        className="object-cover rounded"
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    />
                                    {file.isTemporaryUrl && (
                                        <div className="absolute top-1 left-1 bg-orange-500 text-white text-xs px-2 py-1 rounded">
                                            TEMP
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="w-full h-32 mb-3 bg-gray-100 rounded flex items-center justify-center relative">
                                    <svg className="h-12 w-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                    </svg>
                                    {file.isTemporaryUrl && (
                                        <div className="absolute top-1 left-1 bg-orange-500 text-white text-xs px-2 py-1 rounded">
                                            TEMP
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="space-y-1 text-xs text-gray-600">
                                <p><span className="font-medium">Size:</span> {formatFileSize(file.size)}</p>
                                <p><span className="font-medium">Type:</span> {file.mimeType}</p>
                                <p><span className="font-medium">Visibility:</span> {file.visibility || 'unknown'}</p>
                                <p><span className="font-medium">Uploaded:</span> {formatDate(file.uploadedAt)}</p>
                                {file.isTemporaryUrl && (
                                    <p className="text-orange-600 font-medium">⚠️ Temporary URL (15 min expiry)</p>
                                )}
                            </div>

                            {file.url && (
                                <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-3 inline-block w-full text-center bg-blue-500 text-white py-1 px-3 rounded text-sm hover:bg-blue-600 transition-colors"
                                >
                                    {file.isTemporaryUrl ? 'View File (Temporary)' : 'View File'}
                                </a>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}