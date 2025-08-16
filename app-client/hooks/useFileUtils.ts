import { useCallback } from 'react'

export function useFileUtils() {
    const formatFileSize = useCallback((bytes: number): string => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }, [])

    const isImage = useCallback((mimeType: string): boolean => {
        return mimeType.startsWith('image/')
    }, [])

    const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
        try {
            await navigator.clipboard.writeText(text)
            return true
        } catch (error) {
            console.error('Failed to copy to clipboard:', error)
            return false
        }
    }, [])

    const downloadFile = useCallback((url: string, filename: string): void => {
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }, [])

    const validateFile = useCallback((file: File, options: {
        maxSize?: number
        allowedTypes?: string[]
    } = {}): { valid: boolean; error?: string } => {
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
    }, [formatFileSize])

    const getFileIcon = useCallback((mimeType: string): string => {
        if (mimeType.startsWith('image/')) {
            return '🖼️'
        } else if (mimeType.includes('pdf')) {
            return '📄'
        } else if (mimeType.includes('word') || mimeType.includes('document')) {
            return '📝'
        } else if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
            return '📊'
        } else if (mimeType.includes('zip') || mimeType.includes('archive')) {
            return '📦'
        } else if (mimeType.includes('text')) {
            return '📄'
        } else {
            return '📎'
        }
    }, [])

    const getFileExtension = useCallback((filename: string): string => {
        return filename.split('.').pop()?.toUpperCase() || ''
    }, [])

    const truncateFilename = useCallback((filename: string, maxLength: number = 20): string => {
        if (filename.length <= maxLength) return filename

        const extension = getFileExtension(filename)
        const nameWithoutExt = filename.replace(`.${extension.toLowerCase()}`, '')
        const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 4) + '...'

        return `${truncateFilename}.${extension.toLowerCase()}`
    }, [getFileExtension])

    const formatDate = useCallback((dateString: string): string => {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }, [])

    const getFileTypeCategory = useCallback((mimeType: string): string => {
        if (mimeType.startsWith('image/')) return 'image'
        if (mimeType.includes('video/')) return 'video'
        if (mimeType.includes('audio/')) return 'audio'
        if (mimeType.includes('pdf')) return 'document'
        if (mimeType.includes('word') || mimeType.includes('document')) return 'document'
        if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'spreadsheet'
        if (mimeType.includes('zip') || mimeType.includes('archive')) return 'archive'
        if (mimeType.includes('text/')) return 'text'
        return 'other'
    }, [])

    return {
        formatFileSize,
        isImage,
        copyToClipboard,
        downloadFile,
        validateFile,
        getFileIcon,
        getFileExtension,
        truncateFilename,
        formatDate,
        getFileTypeCategory
    }
} 