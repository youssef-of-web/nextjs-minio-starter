import { MinioClient } from './client'
import { nanoid } from 'nanoid'
import crypto from 'crypto'

// URL mapping interface for tracking secure URLs
interface SecureUrlMapping {
    id: string
    originalUrl: string
    securePath: string
    bucketName: string
    objectKey: string
    expiresAt?: Date
    createdAt: Date
    accessCount: number
    maxAccesses?: number
}

// In-memory storage for URL mappings (in production, use Redis or database)
const urlMappings = new Map<string, SecureUrlMapping>()

// Cleanup expired mappings every hour
setInterval(() => {
    const now = new Date()
    for (const [id, mapping] of urlMappings.entries()) {
        if (mapping.expiresAt && mapping.expiresAt < now) {
            urlMappings.delete(id)
        }
        if (mapping.maxAccesses && mapping.accessCount >= mapping.maxAccesses) {
            urlMappings.delete(id)
        }
    }
}, 60 * 60 * 1000) // 1 hour

/**
 * Generate a secure, obfuscated URL for file access
 */
export async function generateSecureUrl({
    bucketName,
    objectKey,
    originalUrl,
    expiryHours = 24,
    maxAccesses,
    customPath,
}: {
    bucketName: string
    objectKey: string
    originalUrl: string
    expiryHours?: number
    maxAccesses?: number
    customPath?: string
}): Promise<string> {
    try {
        // Verify file exists
        await MinioClient.statObject(bucketName, objectKey)

        // Generate unique secure path
        const secureId = nanoid(16)
        const timestamp = Date.now().toString(36)
        const hash = crypto.createHash('sha256')
            .update(`${bucketName}${objectKey}${timestamp}`)
            .digest('hex')
            .substring(0, 8)

        const securePath = customPath || `/secure/${secureId}/${timestamp}/${hash}`

        // Calculate expiry
        const expiresAt = new Date(Date.now() + (expiryHours * 60 * 60 * 1000))

        // Store mapping
        const mapping: SecureUrlMapping = {
            id: secureId,
            originalUrl,
            securePath,
            bucketName,
            objectKey,
            expiresAt,
            createdAt: new Date(),
            accessCount: 0,
            maxAccesses,
        }

        urlMappings.set(secureId, mapping)

        // Return secure URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        return `${baseUrl}/api/secure/${secureId}/${timestamp}/${hash}`

    } catch (error) {
        console.error('Error generating secure URL:', error)
        throw new Error('Failed to generate secure URL')
    }
}

/**
 * Resolve secure URL to original file data
 */
export function resolveSecureUrl(secureId: string, timestamp: string, hash: string): {
    bucketName: string
    objectKey: string
    originalUrl: string
} | null {
    const mapping = urlMappings.get(secureId)

    if (!mapping) {
        return null
    }

    // Verify hash
    const expectedHash = crypto.createHash('sha256')
        .update(`${mapping.bucketName}${mapping.objectKey}${timestamp}`)
        .digest('hex')
        .substring(0, 8)

    if (hash !== expectedHash) {
        return null
    }

    // Check expiry
    if (mapping.expiresAt && mapping.expiresAt < new Date()) {
        urlMappings.delete(secureId)
        return null
    }

    // Check access limit
    if (mapping.maxAccesses && mapping.accessCount >= mapping.maxAccesses) {
        urlMappings.delete(secureId)
        return null
    }

    // Increment access count
    mapping.accessCount++

    return {
        bucketName: mapping.bucketName,
        objectKey: mapping.objectKey,
        originalUrl: mapping.originalUrl,
    }
}

/**
 * Generate a temporary secure URL with short expiry
 */
export async function generateTemporarySecureUrl({
    bucketName,
    objectKey,
    originalUrl,
    expiryMinutes = 15,
}: {
    bucketName: string
    objectKey: string
    originalUrl: string
    expiryMinutes?: number
}): Promise<string> {
    return generateSecureUrl({
        bucketName,
        objectKey,
        originalUrl,
        expiryHours: expiryMinutes / 60,
        maxAccesses: 1, // Single use
    })
}

/**
 * Generate a secure URL with access tracking
 */
export async function generateTrackedSecureUrl({
    bucketName,
    objectKey,
    originalUrl,
    expiryHours = 24,
    maxAccesses = 10,
}: {
    bucketName: string
    objectKey: string
    originalUrl: string
    expiryHours?: number
    maxAccesses?: number
}): Promise<string> {
    return generateSecureUrl({
        bucketName,
        objectKey,
        originalUrl,
        expiryHours,
        maxAccesses,
    })
}

/**
 * Invalidate a secure URL
 */
export function invalidateSecureUrl(secureId: string): boolean {
    return urlMappings.delete(secureId)
}

/**
 * Get secure URL statistics
 */
export function getSecureUrlStats(secureId: string): {
    accessCount: number
    createdAt: Date
    expiresAt?: Date
    maxAccesses?: number
} | null {
    const mapping = urlMappings.get(secureId)

    if (!mapping) {
        return null
    }

    return {
        accessCount: mapping.accessCount,
        createdAt: mapping.createdAt,
        expiresAt: mapping.expiresAt,
        maxAccesses: mapping.maxAccesses,
    }
}

/**
 * List all active secure URLs
 */
export function listActiveSecureUrls(): Array<{
    id: string
    bucketName: string
    objectKey: string
    accessCount: number
    createdAt: Date
    expiresAt?: Date
}> {
    return Array.from(urlMappings.values()).map(mapping => ({
        id: mapping.id,
        bucketName: mapping.bucketName,
        objectKey: mapping.objectKey,
        accessCount: mapping.accessCount,
        createdAt: mapping.createdAt,
        expiresAt: mapping.expiresAt,
    }))
} 