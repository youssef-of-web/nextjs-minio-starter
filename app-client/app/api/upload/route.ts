import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
    uploadFile,
    FileVisibility,
    getFileUrl,
    generateTemporarySecureFileUrl,
    createBucket,
    BUCKETS
} from '@/lib/minio-utils'
import { config } from '@/lib/config'

// Disable body parsing for file uploads
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            )
        }

        // Validate file size
        if (file.size > config.upload.maxFileSize) {
            return NextResponse.json(
                { error: `File too large. Maximum size is ${config.upload.maxFileSize / (1024 * 1024)}MB` },
                { status: 400 }
            )
        }

        // Validate file type
        if (!config.upload.allowedTypes.includes(file.type) && file.type !== '') {
            return NextResponse.json(
                { error: 'File type not allowed' },
                { status: 400 }
            )
        }

        // Convert File to Buffer
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Determine visibility based on file type (images are public, documents are private)
        const isImage = file.type.startsWith('image/')
        const visibility: FileVisibility = isImage ? 'public' : 'private'

        // Ensure buckets exist before upload
        try {
            await createBucket(BUCKETS.PUBLIC, true) // Public bucket
            await createBucket(BUCKETS.PRIVATE, false) // Private bucket
        } catch (error) {
            console.warn('Bucket creation warning:', error)
            // Continue with upload even if bucket creation fails (buckets might already exist)
        }

        // Generate folder structure based on file type and date
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        const folder = `${year}/${month}/${day}`

        // Upload to MinIO using new utilities
        const fileMetadata = await uploadFile(buffer, file.name, {
            visibility,
            folder,
            contentType: file.type || 'application/octet-stream',
            metadata: {
                'user-agent': request.headers.get('user-agent') || 'unknown',
                'upload-source': 'web-interface',
                'upload-date': now.toISOString(),
                'file-size': file.size.toString(),
            }
        })

        // Save to database
        const savedFile = await prisma.file.create({
            data: {
                filename: fileMetadata.fileName,
                originalName: fileMetadata.originalName,
                mimeType: fileMetadata.mimeType,
                size: fileMetadata.size,
                bucketName: fileMetadata.bucket,
                objectKey: fileMetadata.objectKey,
                url: fileMetadata.url,
                userId: null, // TODO: Add user authentication
            },
        })

        return NextResponse.json({
            success: true,
            file: {
                id: savedFile.id,
                filename: savedFile.filename,
                originalName: fileMetadata.originalName,
                url: fileMetadata.url,
                size: fileMetadata.size,
                mimeType: fileMetadata.mimeType,
                bucket: fileMetadata.bucket,
                visibility: fileMetadata.visibility,
                folder: fileMetadata.folder,
                uploadedAt: savedFile.uploadedAt,
            },
        })
    } catch (error) {
        console.error('Upload error:', error)
        return NextResponse.json(
            { error: 'Upload failed', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const limit = parseInt(searchParams.get('limit') || '50')
        const offset = parseInt(searchParams.get('offset') || '0')
        const search = searchParams.get('search') || ''
        const useTemporaryUrls = searchParams.get('temporary') === 'true'

        // Build query
        const where = search ? {
            OR: [
                { originalName: { contains: search, mode: 'insensitive' } },
                { filename: { contains: search, mode: 'insensitive' } },
            ]
        } : {}

        const files = await prisma.file.findMany({
            where,
            orderBy: { uploadedAt: 'desc' },
            take: Math.min(limit, 100), // Max 100 files per request
            skip: offset,
        })

        const total = await prisma.file.count({ where })

        // Process files and generate URLs using MinIO utilities
        const processedFiles = await Promise.all(
            files.map(async (file: any) => {
                const visibility = file.bucketName.includes('public') ? 'public' : 'private'

                let url = file.url

                // Generate temporary URL if requested
                if (useTemporaryUrls && visibility === 'private') {
                    try {
                        url = await generateTemporarySecureFileUrl({
                            bucketName: file.bucketName,
                            fileName: file.objectKey,
                            expiryMinutes: 15, // 15 minutes expiry
                        })
                    } catch (error) {
                        console.warn(`Failed to generate temporary URL for file ${file.id}:`, error)
                        // Fallback to original URL
                    }
                } else if (!url) {
                    // Generate URL using MinIO utilities if not already present
                    try {
                        url = await getFileUrl(file.bucketName, file.objectKey, visibility)
                    } catch (error) {
                        console.warn(`Failed to generate URL for file ${file.id}:`, error)
                        url = null
                    }
                }

                return {
                    id: file.id,
                    filename: file.filename,
                    originalName: file.originalName,
                    url: url,
                    size: file.size,
                    mimeType: file.mimeType,
                    bucket: file.bucketName,
                    objectKey: file.objectKey,
                    visibility: visibility,
                    uploadedAt: file.uploadedAt,
                    isTemporaryUrl: useTemporaryUrls && visibility === 'private',
                }
            })
        )

        return NextResponse.json({
            success: true,
            files: processedFiles,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + limit < total
            }
        })
    } catch (error) {
        console.error('Get files error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch files' },
            { status: 500 }
        )
    }
}

