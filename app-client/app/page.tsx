'use client'

import { useState } from 'react'
import FileUpload from '@/components/FileUpload'
import FileGallery from '@/components/FileGallery'

interface UploadedFile {
  id: string
  filename: string
  originalName: string
  url: string
  size: number
  mimeType: string
  uploadedAt: string
}

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleUploadComplete = (file: UploadedFile) => {
    console.log('File uploaded:', file)
    // Trigger gallery refresh
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Next.js + MinIO File Storage
          </h1>
          <p className="text-lg text-gray-600">
            Upload, store, and manage your files with MinIO object storage
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Upload Files</h2>
          <FileUpload
            onUploadComplete={handleUploadComplete}
            accept="*/*"
            maxSize={50 * 1024 * 1024} // 50MB
            multiple={true}
          />
        </div>

        {/* Gallery Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Your Files</h2>
          <FileGallery refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </div>
  )
}