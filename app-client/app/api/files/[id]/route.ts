import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { deleteFile, generateTemporarySecureFileUrl } from '@/lib/minio-utils'

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        // Find the file in database
        const file = await prisma.file.findUnique({
            where: { id },
        })

        if (!file) {
            return NextResponse.json(
                { error: 'File not found' },
                { status: 404 }
            )
        }

        // Delete from MinIO
        await deleteFile(file.bucketName, file.objectKey)

        // Delete from database
        await prisma.file.delete({
            where: { id },
        })

        return NextResponse.json({
            success: true,
            message: 'File deleted successfully',
        })
    } catch (error) {
        console.error('Delete error:', error)
        return NextResponse.json(
            { error: 'Failed to delete file' },
            { status: 500 }
        )
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        const file = await prisma.file.findUnique({
            where: { id },
        })

        if (!file) {
            return NextResponse.json(
                { error: 'File not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            file: {
                id: file.id,
                filename: file.filename,
                originalName: file.originalName,
                url: file.url,
                size: file.size,
                mimeType: file.mimeType,
                uploadedAt: file.uploadedAt,
            },
        })
    } catch (error) {
        console.error('Get file error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch file' },
            { status: 500 }
        )
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()
        const { action } = body

        // Find the file in database
        const file = await prisma.file.findUnique({
            where: { id },
        })

        if (!file) {
            return NextResponse.json(
                { error: 'File not found' },
                { status: 404 }
            )
        }

        if (action === 'generateTemporaryUrl') {
            try {
                const temporaryUrl = await generateTemporarySecureFileUrl({
                    bucketName: file.bucketName,
                    fileName: file.objectKey,
                    expiryMinutes: 15, // 15 minutes expiry
                })

                return NextResponse.json({
                    success: true,
                    temporaryUrl,
                    expiresIn: '15 minutes',
                    message: 'Temporary URL generated successfully',
                })
            } catch (error) {
                console.error('Error generating temporary URL:', error)
                return NextResponse.json(
                    { error: 'Failed to generate temporary URL' },
                    { status: 500 }
                )
            }
        }

        return NextResponse.json(
            { error: 'Invalid action' },
            { status: 400 }
        )
    } catch (error) {
        console.error('PUT error:', error)
        return NextResponse.json(
            { error: 'Failed to process request' },
            { status: 500 }
        )
    }
}

