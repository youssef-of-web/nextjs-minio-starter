import { NextRequest, NextResponse } from 'next/server'
import { resolveSecureUrl } from '@/lib/secure-url'
import { MinioClient } from '@/lib/client'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ secureId: string; timestamp: string; hash: string }> }
) {
    try {
        const { secureId, timestamp, hash } = await params

        // Resolve the secure URL
        const fileData = resolveSecureUrl(secureId, timestamp, hash)

        if (!fileData) {
            return NextResponse.json(
                { error: 'Invalid or expired secure URL' },
                { status: 404 }
            )
        }

        const { bucketName, objectKey } = fileData

        // Get file stats
        const stats = await MinioClient.statObject(bucketName, objectKey)

        // Get file stream
        const fileStream = await MinioClient.getObject(bucketName, objectKey)

        // Create response with appropriate headers
        const response = new NextResponse(fileStream as any)

        // Set content type
        response.headers.set('Content-Type', stats.metaData?.['content-type'] || 'application/octet-stream')

        // Set content length
        response.headers.set('Content-Length', stats.size.toString())

        // Set cache headers
        response.headers.set('Cache-Control', 'private, max-age=3600')

        // Set security headers
        response.headers.set('X-Content-Type-Options', 'nosniff')
        response.headers.set('X-Frame-Options', 'DENY')
        response.headers.set('X-XSS-Protection', '1; mode=block')

        // Set filename header if available
        const originalName = stats.metaData?.['original-name']
        if (originalName) {
            response.headers.set('Content-Disposition', `inline; filename="${originalName}"`)
        }

        return response

    } catch (error) {
        console.error('Error serving secure file:', error)
        return NextResponse.json(
            { error: 'Failed to serve file' },
            { status: 500 }
        )
    }
}

// Handle HEAD requests for file metadata
export async function HEAD(
    request: NextRequest,
    { params }: { params: Promise<{ secureId: string; timestamp: string; hash: string }> }
) {
    try {
        const { secureId, timestamp, hash } = await params

        // Resolve the secure URL
        const fileData = resolveSecureUrl(secureId, timestamp, hash)

        if (!fileData) {
            return NextResponse.json(
                { error: 'Invalid or expired secure URL' },
                { status: 404 }
            )
        }

        const { bucketName, objectKey } = fileData

        // Get file stats
        const stats = await MinioClient.statObject(bucketName, objectKey)

        // Create response with headers only
        const response = new NextResponse(null, { status: 200 })

        // Set content type
        response.headers.set('Content-Type', stats.metaData?.['content-type'] || 'application/octet-stream')

        // Set content length
        response.headers.set('Content-Length', stats.size.toString())

        // Set cache headers
        response.headers.set('Cache-Control', 'private, max-age=3600')

        // Set security headers
        response.headers.set('X-Content-Type-Options', 'nosniff')
        response.headers.set('X-Frame-Options', 'DENY')
        response.headers.set('X-XSS-Protection', '1; mode=block')

        // Set filename header if available
        const originalName = stats.metaData?.['original-name']
        if (originalName) {
            response.headers.set('Content-Disposition', `inline; filename="${originalName}"`)
        }

        return response

    } catch (error) {
        console.error('Error getting file metadata:', error)
        return NextResponse.json(
            { error: 'Failed to get file metadata' },
            { status: 500 }
        )
    }
} 