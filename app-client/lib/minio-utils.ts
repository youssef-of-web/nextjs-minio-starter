import { BucketItemStat } from 'minio'
import { nanoid } from 'nanoid'
import type internal from 'stream'
import { MinioClient } from './client'
import { config, getPublicFileUrl } from './config'
import {
    generateSecureUrl,
    generateTemporarySecureUrl,
} from './secure-url'

// Initialize MinIO client (keeping for backward compatibility)
const minioClient = MinioClient

// Bucket configurations
export const BUCKETS = {
    PUBLIC: config.minio.publicBucket,
    PRIVATE: config.minio.privateBucket,
} as const

export type BucketType = keyof typeof BUCKETS
export type FileVisibility = 'public' | 'private'

// File metadata interface
export interface FileMetadata {
    id: string
    originalName: string
    fileName: string
    mimeType: string
    size: number
    bucket: string
    objectKey: string
    visibility: FileVisibility
    folder?: string
    url?: string
    createdAt: Date
    updatedAt: Date
}

// Upload options interface
export interface UploadOptions {
    visibility?: FileVisibility
    folder?: string
    fileName?: string
    metadata?: Record<string, string>
    contentType?: string
}

// ===========================================
// BUCKET MANAGEMENT
// ===========================================

/**
 * Check if a bucket exists
 */
export async function bucketExists(bucketName: string): Promise<boolean> {
    try {
        return await minioClient.bucketExists(bucketName)
    } catch (error) {
        console.error(`Error checking bucket existence: ${bucketName}`, error)
        // If it's a connection error, throw it to be handled upstream
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (errorMessage.includes('API port') || errorMessage.includes('InvalidArgument')) {
            throw new Error(`MinIO connection failed. Please ensure MinIO is running on ${config.minio.endpoint}:${config.minio.port}. Error: ${errorMessage}`)
        }
        return false
    }
}

/**
 * Create a bucket with appropriate policies
 */
export async function createBucket(
    bucketName: string,
    isPublic: boolean = false,
    region: string = 'us-east-1'
): Promise<void> {
    try {
        const exists = await bucketExists(bucketName)
        if (exists) {
            console.log(`Bucket "${bucketName}" already exists`)
            return
        }

        await minioClient.makeBucket(bucketName, region)
        console.log(`Bucket "${bucketName}" created successfully`)

        // Set bucket policy based on visibility
        if (isPublic) {
            await setPublicBucketPolicy(bucketName)
        } else {
            await setPrivateBucketPolicy(bucketName)
        }
    } catch (error) {
        console.error(`Error creating bucket: ${bucketName}`, error)
        throw new Error(`Failed to create bucket: ${bucketName}`)
    }
}


// ===========================================
// BUCKET POLICIES
// ===========================================

/**
 * Set secure public read policy for a bucket with referrer protection
 */
async function setPublicBucketPolicy(bucketName: string): Promise<void> {
    const websiteDomain = process.env.FRONTEND_APP_DOMAIN || 'app.localhost'

    const policy = {
        Version: '2012-10-17',
        Statement: [
            {
                Sid: 'AllowPublicReadWithReferrerCheck',
                Effect: 'Allow',
                Principal: { AWS: ['*'] },
                Action: ['s3:GetObject'],
                Resource: [`arn:aws:s3:::${bucketName}/*`],
                Condition: {
                    StringLike: {
                        'aws:Referer': [
                            `*${websiteDomain}*`,
                            `*localhost*`, // Allow localhost for development
                        ]
                    }
                }
            },
            {
                Sid: 'AllowDirectAccessFromWebsite',
                Effect: 'Allow',
                Principal: { AWS: ['*'] },
                Action: ['s3:GetObject'],
                Resource: [`arn:aws:s3:::${bucketName}/*`],
                Condition: {
                    StringEquals: {
                        's3:ExistingObjectTag/source': 'website'
                    }
                }
            }
        ],
    }

    try {
        await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy))
        console.log(`Secure public policy set for bucket: ${bucketName}`)
    } catch (error) {
        console.error(`Error setting public policy for bucket: ${bucketName}`, error)
    }
}

/**
 * Set private policy for a bucket (no public access)
 */
async function setPrivateBucketPolicy(bucketName: string): Promise<void> {
    const policy = {
        Version: '2012-10-17',
        Statement: [], // Empty statements = no public access
    }

    try {
        await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy))
        console.log(`Private policy set for bucket: ${bucketName}`)
    } catch (error) {
        console.error(`Error setting private policy for bucket: ${bucketName}`, error)
    }
}

// ===========================================
// FILE UPLOAD
// ===========================================

/**
 * Upload a file to MinIO with visibility and folder options
 */
export async function uploadFile(
    buffer: Buffer,
    originalName: string,
    options: UploadOptions = {}
): Promise<FileMetadata> {
    const {
        visibility = 'private',
        folder,
        fileName,
        metadata = {},
        contentType
    } = options

    try {
        // Determine bucket based on visibility
        const bucketName = visibility === 'public' ? BUCKETS.PUBLIC : BUCKETS.PRIVATE

        // Ensure bucket exists
        await createBucket(bucketName, visibility === 'public')

        // Generate unique file name
        const fileExtension = originalName.split('.').pop() || ''
        const uniqueFileName = fileName || `${nanoid()}.${fileExtension}`

        // Create object key with optional folder
        const objectKey = folder ? `${folder}/${uniqueFileName}` : uniqueFileName

        // Prepare metadata with security tags
        const fileMetadata = {
            'original-name': originalName,
            'upload-date': new Date().toISOString(),
            'file-id': nanoid(),
            'visibility': visibility,
            'source': 'website', // Tag for bucket policy
            'domain': process.env.FRONTEND_APP_DOMAIN || 'app.localhost',
            ...metadata,
        }

        // Upload file with tags for security
        await minioClient.putObject(
            bucketName,
            objectKey,
            buffer,
            buffer.length,
            {
                'Content-Type': contentType || 'application/octet-stream',
                ...fileMetadata,
            }
        )

        // Set object tags for additional security
        if (visibility === 'public') {
            try {
                await minioClient.setObjectTagging(bucketName, objectKey, {
                    source: 'website',
                    domain: process.env.FRONTEND_APP_DOMAIN || 'app.localhost',
                    visibility: visibility,
                })
            } catch (error) {
                console.warn('Could not set object tags:', error)
            }
        }

        // Generate file metadata
        const result: FileMetadata = {
            id: fileMetadata['file-id'],
            originalName,
            fileName: uniqueFileName,
            mimeType: contentType || 'application/octet-stream',
            size: buffer.length,
            bucket: bucketName,
            objectKey,
            visibility,
            folder,
            url: await getFileUrl(bucketName, objectKey, visibility),
            createdAt: new Date(),
            updatedAt: new Date(),
        }

        console.log(`File uploaded successfully: ${objectKey}`)
        return result
    } catch (error) {
        console.error('Error uploading file', error)
        throw new Error('Failed to upload file')
    }
}

// ===========================================
// FILE DOWNLOAD & ACCESS
// ===========================================

/**
 * Get file URL based on visibility
 */
export async function getFileUrl(
    bucketName: string,
    objectKey: string,
    visibility: FileVisibility,
    expiry: number = 3600
): Promise<string> {
    try {
        if (visibility === 'public') {
            // For public files, return direct URL using centralized config
            const url = getPublicFileUrl(bucketName, objectKey)
            // Validate URL format
            try {
                new URL(url)
                return url
            } catch (urlError) {
                console.error('Invalid URL generated:', url)
                throw new Error('Invalid URL format generated')
            }
        } else {
            // For private files, return presigned URL
            return await minioClient.presignedGetObject(bucketName, objectKey, expiry)
        }
    } catch (error) {
        console.error('Error generating file URL', error)
        throw new Error('Failed to generate file URL')
    }
}

/**
 * Download a file as buffer
 */
export async function downloadFile(bucketName: string, objectKey: string): Promise<Buffer> {
    try {
        const stream = await minioClient.getObject(bucketName, objectKey)
        const chunks: Buffer[] = []

        return new Promise((resolve, reject) => {
            stream.on('data', (chunk) => chunks.push(chunk))
            stream.on('end', () => resolve(Buffer.concat(chunks)))
            stream.on('error', reject)
        })
    } catch (error) {
        console.error('Error downloading file', error)
        throw new Error('Failed to download file')
    }
}

/**
 * Get file metadata/stats
 */
export async function getFileStats(bucketName: string, objectKey: string): Promise<BucketItemStat> {
    try {
        return await minioClient.statObject(bucketName, objectKey)
    } catch (error) {
        console.error('Error getting file stats', error)
        throw new Error('Failed to get file stats')
    }
}

// ===========================================
// FILE MANAGEMENT
// ===========================================

/**
 * Delete a file from MinIO
 */
export async function deleteFile(bucketName: string, objectKey: string): Promise<void> {
    try {
        await minioClient.removeObject(bucketName, objectKey)
        console.log(`File deleted successfully: ${objectKey}`)
    } catch (error) {
        console.error('Error deleting file', error)
        throw new Error('Failed to delete file')
    }
}

// File copying removed - use update visibility instead

/**
 * Update file visibility (move between public/private buckets)
 */
export async function updateFileVisibility(
    currentBucket: string,
    objectKey: string,
    newVisibility: FileVisibility
): Promise<string> {
    try {
        const newBucket = newVisibility === 'public' ? BUCKETS.PUBLIC : BUCKETS.PRIVATE

        if (currentBucket === newBucket) {
            console.log('File is already in the correct bucket')
            return newBucket
        }

        // Ensure target bucket exists
        await createBucket(newBucket, newVisibility === 'public')

        // Copy the file to new bucket
        await minioClient.copyObject(
            newBucket,
            objectKey,
            `/${currentBucket}/${objectKey}`
        )

        // Delete from old bucket
        await deleteFile(currentBucket, objectKey)

        console.log(`File visibility updated: ${objectKey} -> ${newVisibility}`)
        return newBucket
    } catch (error) {
        console.error('Error updating file visibility', error)
        throw new Error('Failed to update file visibility')
    }
}

// ===========================================
// FOLDER MANAGEMENT
// ===========================================

/**
 * List files in a folder (prefix)
 */
export async function listFilesInFolder(
    bucketName: string,
    folderPrefix: string = '',
    recursive: boolean = false
): Promise<any[]> {
    try {
        const stream = minioClient.listObjects(bucketName, folderPrefix, recursive)
        const objects: any[] = []

        return new Promise((resolve, reject) => {
            stream.on('data', (obj) => objects.push(obj))
            stream.on('end', () => resolve(objects))
            stream.on('error', reject)
        })
    } catch (error) {
        console.error('Error listing files in folder', error)
        throw new Error('Failed to list files in folder')
    }
}

/**
 * Create a folder (by uploading an empty object)
 */
export async function createFolder(bucketName: string, folderName: string): Promise<void> {
    try {
        const folderKey = folderName.endsWith('/') ? folderName : `${folderName}/`
        const emptyBuffer = Buffer.alloc(0)

        await minioClient.putObject(bucketName, folderKey, emptyBuffer, 0)
        console.log(`Folder created: ${folderKey}`)
    } catch (error) {
        console.error('Error creating folder', error)
        throw new Error('Failed to create folder')
    }
}

// Folder deletion removed for security - delete files individually instead

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

// Bulk deletion removed for security

/**
 * Generate presigned upload URL
 */
export async function generatePresignedUploadUrl(
    bucketName: string,
    objectKey: string,
    expiry: number = 3600
): Promise<string> {
    try {
        return await minioClient.presignedPutObject(bucketName, objectKey, expiry)
    } catch (error) {
        console.error('Error generating presigned upload URL', error)
        throw new Error('Failed to generate presigned upload URL')
    }
}

/**
 * Get bucket storage usage statistics
 */
export async function getBucketStats(bucketName: string): Promise<{
    objectCount: number
    totalSize: number
    folders: string[]
}> {
    try {
        const objects = await listFilesInFolder(bucketName, '', true)

        const totalSize = objects.reduce((sum, obj) => sum + (obj.size || 0), 0)
        const folders = [...new Set(
            objects
                .map(obj => obj.name?.split('/')[0])
                .filter(folder => folder !== '' && folder !== undefined)
        )]

        return {
            objectCount: objects.length,
            totalSize,
            folders
        }
    } catch (error) {
        console.error('Error getting bucket stats', error)
        throw new Error('Failed to get bucket stats')
    }
}


// ===========================================
// COMPATIBILITY FUNCTIONS (as requested)
// ===========================================

/**
 * Create bucket if it doesn't exist
 */
export async function createBucketIfNotExists(bucketName: string) {
    const bucketExists = await MinioClient.bucketExists(bucketName);
    if (!bucketExists) {
        await MinioClient.makeBucket(bucketName);
    }
}

/**
 * Save file in bucket with duplicate check
 */
export async function saveFileInBucket({
    bucketName,
    fileName,
    file,
}: {
    bucketName: string;
    fileName: string;
    file: Buffer | internal.Readable;
}) {
    // Create bucket if it doesn't exist
    await createBucketIfNotExists(bucketName);

    // check if file exists
    const fileExists = await checkFileExistsInBucket({
        bucketName,
        fileName,
    });

    if (fileExists) {
        throw new Error("File already exists");
    }

    // Upload image to S3 bucket
    await MinioClient.putObject(bucketName, fileName, file);
}

/**
 * Check if file exists in bucket
 */
export async function checkFileExistsInBucket({
    bucketName,
    fileName,
}: {
    bucketName: string;
    fileName: string;
}) {
    try {
        await MinioClient.statObject(bucketName, fileName);
    } catch (error) {
        return false;
    }
    return true;
}

/**
 * Get file from bucket
 */
export async function getFileFromBucket({
    bucketName,
    fileName,
}: {
    bucketName: string;
    fileName: string;
}) {
    try {
        await MinioClient.statObject(bucketName, fileName);
    } catch (error) {
        console.error(error);
        return null;
    }
    return await MinioClient.getObject(bucketName, fileName);
}

/**
 * Delete file from bucket
 */
export async function deleteFileFromBucket({
    bucketName,
    fileName,
}: {
    bucketName: string;
    fileName: string;
}) {
    try {
        await MinioClient.removeObject(bucketName, fileName);
    } catch (error) {
        console.error(error);
        return false;
    }
    return true;
}

/**
 * Create presigned URL for upload
 */
export async function createPresignedUrlToUpload({
    bucketName,
    fileName,
    expiry = 60 * 60, // 1 hour
}: {
    bucketName: string;
    fileName: string;
    expiry?: number;
}) {
    // Create bucket if it doesn't exist
    await createBucketIfNotExists(bucketName);

    return await MinioClient.presignedPutObject(bucketName, fileName, expiry);
}

/**
 * Create presigned URL for download
 */
export async function createPresignedUrlToDownload({
    bucketName,
    fileName,
    expiry = 60 * 60, // 1 hour
}: {
    bucketName: string;
    fileName: string;
    expiry?: number;
}) {
    return await MinioClient.presignedGetObject(bucketName, fileName, expiry);
}

/**
 * Generate secure URL to hide original MinIO URL
 */
export async function generateSecureFileUrl({
    bucketName,
    fileName,
    expiryHours = 24,
    maxAccesses,
}: {
    bucketName: string;
    fileName: string;
    expiryHours?: number;
    maxAccesses?: number;
}): Promise<string> {
    try {
        // Get the original URL first
        const originalUrl = await getFileUrl(bucketName, fileName, 'private');

        // Generate secure URL
        return await generateSecureUrl({
            bucketName,
            objectKey: fileName,
            originalUrl,
            expiryHours,
            maxAccesses,
        });
    } catch (error) {
        console.error('Error generating secure file URL:', error);
        throw new Error('Failed to generate secure file URL');
    }
}

/**
 * Generate temporary secure URL (short expiry, single use)
 */
export async function generateTemporarySecureFileUrl({
    bucketName,
    fileName,
    expiryMinutes = 15,
}: {
    bucketName: string;
    fileName: string;
    expiryMinutes?: number;
}): Promise<string> {
    try {
        const originalUrl = await getFileUrl(bucketName, fileName, 'private');

        return await generateTemporarySecureUrl({
            bucketName,
            objectKey: fileName,
            originalUrl,
            expiryMinutes,
        });
    } catch (error) {
        console.error('Error generating temporary secure file URL:', error);
        throw new Error('Failed to generate temporary secure file URL');
    }
}

// Export the old functions for backward compatibility
export {
    minioClient,
    BUCKETS as BUCKET_NAME,
}