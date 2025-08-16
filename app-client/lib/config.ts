// Centralized configuration for the application
export const config = {
    // MinIO Configuration
    minio: {
        endpoint: process.env.MINIO_ENDPOINT || 'localhost',
        port: parseInt(process.env.MINIO_PORT || '9001'), // API port (mapped from container 9000)
        useSSL: process.env.MINIO_USE_SSL === 'true',
        accessKey: process.env.MINIO_ACCESS_KEY || '',
        secretKey: process.env.MINIO_SECRET_KEY || '',
        publicBucket: process.env.MINIO_PUBLIC_BUCKET || 'public',
        privateBucket: process.env.MINIO_PRIVATE_BUCKET || 'private',
    },

    // App Configuration
    app: {
        url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        environment: process.env.NODE_ENV || 'development',
    },

    // Database Configuration
    database: {
        url: process.env.DATABASE_URL,
    },

    // Upload Configuration
    upload: {
        maxFileSize: 100 * 1024 * 1024, // 100MB
        allowedTypes: [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf', 'text/plain', 'text/csv',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/zip', 'application/x-zip-compressed'
        ],
    },

    // Security Configuration
    security: {
        secureUrlExpiryHours: 24,
        temporaryUrlExpiryMinutes: 15,
        maxAccesses: 10,
    }
}

// Helper functions
export const getMinioUrl = () => {
    const protocol = config.minio.useSSL ? 'https' : 'http'
    return `${protocol}://${config.minio.endpoint}:${config.minio.port}`
}

export const getMinioConsoleUrl = () => {
    const protocol = config.minio.useSSL ? 'https' : 'http'
    return `${protocol}://${config.minio.endpoint}:${config.minio.port}`
}

export const getPublicFileUrl = (bucketName: string, objectKey: string) => {
    const protocol = config.minio.useSSL ? 'https' : 'http'
    return `${protocol}://${config.minio.endpoint}:${config.minio.port}/${bucketName}/${objectKey}`
}

// Validation functions
export const validateMinioConfig = () => {
    const required = ['endpoint', 'port', 'accessKey', 'secretKey']
    const missing = required.filter(key => !config.minio[key as keyof typeof config.minio])

    if (missing.length > 0) {
        throw new Error(`Missing required MinIO configuration: ${missing.join(', ')}`)
    }

    // Additional validation for access keys
    if (!config.minio.accessKey || config.minio.accessKey === '') {
        throw new Error('MINIO_ACCESS_KEY is required. Please generate access keys from MinIO Console.')
    }

    if (!config.minio.secretKey || config.minio.secretKey === '') {
        throw new Error('MINIO_SECRET_KEY is required. Please generate access keys from MinIO Console.')
    }

    return true
}

// Log configuration (only in development)
if (config.app.environment === 'development') {
    console.log('🔧 App Configuration:', {
        minio: {
            endpoint: config.minio.endpoint,
            port: config.minio.port,
            useSSL: config.minio.useSSL,
            accessKey: config.minio.accessKey,
            buckets: {
                public: config.minio.publicBucket,
                private: config.minio.privateBucket,
            }
        },
        app: {
            url: config.app.url,
            environment: config.app.environment,
        }
    })
} 