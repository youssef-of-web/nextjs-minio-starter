import { useState, useEffect } from 'react'

export interface FileItem {
    id: string
    filename: string
    originalName: string
    url: string
    size: number
    mimeType: string
    uploadedAt: string
    bucket?: string
    objectKey?: string
    visibility?: string
    isTemporaryUrl?: boolean
}

export interface UseFilesOptions {
    refreshTrigger?: number
    useTemporaryUrls?: boolean
}

export function useFiles(options: UseFilesOptions = {}) {
    const [files, setFiles] = useState<FileItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [useTemporaryUrls, setUseTemporaryUrls] = useState(options.useTemporaryUrls || false)

    const fetchFiles = async (temporary: boolean = false) => {
        try {
            setLoading(true)
            const url = temporary
                ? '/api/upload?temporary=true'
                : '/api/upload'

            const response = await fetch(url)
            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to fetch files')
            }

            if (result.success) {
                setFiles(result.files)
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load files')
        } finally {
            setLoading(false)
        }
    }

    const deleteFile = async (id: string) => {
        try {
            const response = await fetch(`/api/files/${id}`, {
                method: 'DELETE',
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to delete file')
            }

            // Remove from local state
            setFiles(files.filter(file => file.id !== id))
            return result
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete file')
            throw err
        }
    }

    const generateTemporaryUrl = async (id: string) => {
        try {
            const response = await fetch(`/api/files/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'generateTemporaryUrl'
                })
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to generate temporary URL')
            }

            // Copy temporary URL to clipboard
            if (result.temporaryUrl) {
                await navigator.clipboard.writeText(result.temporaryUrl)
                alert(`Temporary URL copied to clipboard! Expires in ${result.expiresIn}`)
            }

            return result
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate temporary URL')
            throw err
        }
    }

    const toggleTemporaryUrls = () => {
        const newValue = !useTemporaryUrls
        setUseTemporaryUrls(newValue)
        fetchFiles(newValue)
    }

    const refreshFiles = () => {
        fetchFiles(useTemporaryUrls)
    }

    const clearError = () => {
        setError(null)
    }

    useEffect(() => {
        fetchFiles(useTemporaryUrls)
    }, [options.refreshTrigger])

    return {
        files,
        loading,
        error,
        useTemporaryUrls,
        fetchFiles,
        deleteFile,
        generateTemporaryUrl,
        toggleTemporaryUrls,
        refreshFiles,
        clearError
    }
} 