import { useState } from 'react'

export interface UploadOptions {
    maxSize?: number
    allowedTypes?: string[]
    onProgress?: (progress: number) => void
    onSuccess?: (file: any) => void
    onError?: (error: string) => void
}

export interface UploadState {
    uploading: boolean
    progress: number
    error: string | null
    uploadedFile: any | null
}

export function useFileUpload(options: UploadOptions = {}) {
    const [state, setState] = useState<UploadState>({
        uploading: false,
        progress: 0,
        error: null,
        uploadedFile: null
    })

    const validateFile = (file: File): { valid: boolean; error?: string } => {
        const maxSize = options.maxSize || 100 * 1024 * 1024 // 100MB default
        const allowedTypes = options.allowedTypes || [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf', 'text/plain', 'text/csv',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/zip', 'application/x-zip-compressed'
        ]

        if (file.size > maxSize) {
            return {
                valid: false,
                error: `File too large. Maximum size is ${formatFileSize(maxSize)}`
            }
        }

        if (!allowedTypes.includes(file.type) && file.type !== '') {
            return {
                valid: false,
                error: 'File type not allowed'
            }
        }

        return { valid: true }
    }

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const uploadFile = async (file: File) => {
        // Validate file first
        const validation = validateFile(file)
        if (!validation.valid) {
            const error = validation.error || 'File validation failed'
            setState(prev => ({ ...prev, error }))
            options.onError?.(error)
            return null
        }

        setState(prev => ({
            ...prev,
            uploading: true,
            progress: 0,
            error: null,
            uploadedFile: null
        }))

        try {
            const formData = new FormData()
            formData.append('file', file)

            // Simulate progress (since we can't track actual upload progress with fetch)
            const progressInterval = setInterval(() => {
                setState(prev => {
                    const newProgress = Math.min(prev.progress + 10, 90)
                    options.onProgress?.(newProgress)
                    return { ...prev, progress: newProgress }
                })
            }, 100)

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            })

            clearInterval(progressInterval)

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Upload failed')
            }

            setState(prev => ({
                ...prev,
                uploading: false,
                progress: 100,
                uploadedFile: result.file
            }))

            options.onProgress?.(100)
            options.onSuccess?.(result.file)

            return result.file
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Upload failed'
            setState(prev => ({
                ...prev,
                uploading: false,
                progress: 0,
                error: errorMessage
            }))
            options.onError?.(errorMessage)
            return null
        }
    }

    const uploadMultipleFiles = async (files: File[]) => {
        const results = []

        for (let i = 0; i < files.length; i++) {
            const file = files[i]
            const result = await uploadFile(file)
            results.push(result)

            // Small delay between uploads to avoid overwhelming the server
            if (i < files.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100))
            }
        }

        return results
    }

    const reset = () => {
        setState({
            uploading: false,
            progress: 0,
            error: null,
            uploadedFile: null
        })
    }

    const clearError = () => {
        setState(prev => ({ ...prev, error: null }))
    }

    return {
        ...state,
        uploadFile,
        uploadMultipleFiles,
        validateFile,
        reset,
        clearError
    }
} 