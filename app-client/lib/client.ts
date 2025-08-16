import { Client } from 'minio'
import { config, validateMinioConfig } from './config'

// Validate configuration
validateMinioConfig()

// Initialize MinIO client
export const MinioClient = new Client({
    endPoint: config.minio.endpoint,
    port: config.minio.port,
    useSSL: config.minio.useSSL,
    accessKey: config.minio.accessKey,
    secretKey: config.minio.secretKey,
})

// Export the client instance
export default MinioClient 