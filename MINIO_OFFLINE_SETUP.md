# MinIO Offline Setup Guide

https://hub.docker.com/r/minio/minio/tags

This guide shows you how to download the MinIO Docker image as a tar file and use it without an internet connection.

## 🐳 **Step 1: Download MinIO Image as Tar**

### **Option A: From a machine with internet access**

<p>hello</p>

```bash
# Pull the specific MinIO image
docker pull minio/minio:RELEASE.2024-01-16T16-07-38Z

# Save the image as a tar file
docker save minio/minio:RELEASE.2024-01-16T16-07-38Z -o minio-image.tar

# Verify the tar file was created
ls -lh minio-image.tar
```

### **Option B: Download from Docker Hub directly**

```bash
# Download the image manifest and layers
curl -L -o minio-image.tar \
  "https://registry-1.docker.io/v2/minio/minio/manifests/RELEASE.2024-01-16T16-07-38Z"
```

## 📦 **Step 2: Transfer the Tar File**

### **Copy to target machine**

```bash
# Using SCP
scp minio-image.tar user@target-machine:/path/to/destination/

# Using USB drive or network share
cp minio-image.tar /media/usb-drive/
# Then copy from USB to target machine

# Using rsync
rsync -avz minio-image.tar user@target-machine:/path/to/destination/
```

## 🔧 **Step 3: Load the Image on Target Machine**

```bash
# Load the image from tar file
docker load -i minio-image.tar

# Verify the image is loaded
docker images | grep minio

# Expected output:
# minio/minio    RELEASE.2024-01-16T16-07-38Z    abc123def456    2 weeks ago    245MB
```

## 🚀 **Step 4: Run MinIO Container**

### **Basic Setup**

```bash
# Create a directory for MinIO data
mkdir -p ~/minio-data

# Run MinIO container
docker run -d \
  --name minio \
  -p 9000:9000 \
  -p 9001:9001 \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin123" \
  -v ~/minio-data:/data \
  minio/minio:RELEASE.2024-01-16T16-07-38Z \
  server /data --console-address ":9001"
```

### **Production Setup**

```bash
# Create directories
sudo mkdir -p /opt/minio/data
sudo mkdir -p /opt/minio/config

# Set permissions
sudo chown -R 1000:1000 /opt/minio

# Run with production settings
docker run -d \
  --name minio \
  --restart unless-stopped \
  -p 9000:9000 \
  -p 9001:9001 \
  -e "MINIO_ROOT_USER=your-secure-username" \
  -e "MINIO_ROOT_PASSWORD=your-secure-password" \
  -v /opt/minio/data:/data \
  -v /opt/minio/config:/root/.minio \
  minio/minio:RELEASE.2024-01-16T16-07-38Z \
  server /data --console-address ":9001"
```

## 🔍 **Step 5: Verify Installation**

### **Check Container Status**

```bash
# Check if container is running
docker ps | grep minio

# Check container logs
docker logs minio

# Expected output should show:
# MinIO Object Storage Server
# Copyright: 2015-2024 MinIO, Inc.
# License: GNU AGPLv3 <https://www.gnu.org/licenses/agpl-3.0.html>
# Version: RELEASE.2024-01-16T16-07-38Z (go1.21.6 linux/amd64)
```

### **Access MinIO Console**

1. **Open browser**: `http://localhost:9001`
2. **Login credentials**:
   - Username: `minioadmin`
   - Password: `minioadmin123`

### **Test API Access**

```bash
# Test MinIO API
curl -I http://localhost:9000

# Expected response:
# HTTP/1.1 403 Forbidden
# Server: MinIO
# Date: ...
```

## 🛠️ **Step 6: Create Required Buckets**

### **Using MinIO Console (Web UI)**

1. Open `http://localhost:9001`
2. Login with credentials
3. Click "Create Bucket"
4. Create these buckets:
   - `public` (for public files)
   - `private` (for private files)

### **Using MinIO Client (mc)**

```bash
# Install MinIO Client
wget https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc
sudo mv mc /usr/local/bin/

# Configure client
mc alias set myminio http://localhost:9000 minioadmin minioadmin123

# Create buckets
mc mb myminio/public
mc mb myminio/private

# List buckets
mc ls myminio
```

### **Using Docker Exec**

```bash
# Access MinIO container
docker exec -it minio /bin/bash

# Create buckets
mkdir -p /data/public
mkdir -p /data/private

# Exit container
exit
```

## 🔒 **Step 7: Configure Security**

### **Set Bucket Policies**

```bash
# For public bucket (with referrer protection)
cat > public-policy.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowPublicReadWithReferrerCheck",
            "Effect": "Allow",
            "Principal": { "AWS": ["*"] },
            "Action": ["s3:GetObject"],
            "Resource": ["arn:aws:s3:::public/*"],
            "Condition": {
                "StringLike": {
                    "aws:Referer": [
                        "*yourdomain.com*",
                        "*localhost*"
                    ]
                }
            }
        }
    ]
}
EOF

# Apply policy using mc client
mc policy set myminio/public public-policy.json
```

### **For Private Bucket**

```bash
# Private bucket (no public access)
cat > private-policy.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": []
}
EOF

# Apply policy
mc policy set myminio/private private-policy.json
```

## 📋 **Step 8: Environment Configuration**

### **Create .env.local file**

```bash
# Create environment file
cat > .env.local << 'EOF'
# MinIO Configuration
MINIO_ENDPOINT=localhost
MINIO_PORT=9001
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_PUBLIC_BUCKET=public
MINIO_PRIVATE_BUCKET=private

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
FRONTEND_APP_DOMAIN=localhost
EOF
```

## 🔄 **Step 9: Docker Compose (Optional)**

### **Create docker-compose.yml**

```yaml
version: '3.8'

services:
  minio:
    image: minio/minio:RELEASE.2024-01-16T16-07-38Z
    container_name: minio
    restart: unless-stopped
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin123
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

volumes:
  minio_data:
    driver: local
```

### **Run with Docker Compose**

```bash
# Start MinIO
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs minio

# Stop MinIO
docker-compose down
```

## 🧹 **Step 10: Cleanup**

### **Remove Tar File (Optional)**

```bash
# After successful installation
rm minio-image.tar

# Or keep it for backup
mv minio-image.tar ~/backups/
```

### **Update Image (When Needed)**

```bash
# Pull new version
docker pull minio/minio:NEW_VERSION

# Save new version
docker save minio/minio:NEW_VERSION -o minio-image-NEW_VERSION.tar

# Load on target machine
docker load -i minio-image-NEW_VERSION.tar

# Update container
docker stop minio
docker rm minio
# Then run with new image version
```

## 🔧 **Troubleshooting**

### **Common Issues**

1. **Port already in use**:
   ```bash
   # Check what's using the port
   sudo netstat -tulpn | grep :9000
   
   # Kill process or change port
   docker run -p 9002:9000 -p 9003:9001 ...
   ```

2. **Permission denied**:
   ```bash
   # Fix data directory permissions
   sudo chown -R 1000:1000 /opt/minio/data
   ```

3. **Container won't start**:
   ```bash
   # Check logs
   docker logs minio
   
   # Check if image is loaded
   docker images | grep minio
   ```

### **Health Check**

```bash
# Test MinIO health
curl -f http://localhost:9000/minio/health/live

# Test console access
curl -f http://localhost:9001
```

## 📚 **Additional Resources**

- [MinIO Documentation](https://docs.min.io/)
- [Docker Documentation](https://docs.docker.com/)
- [MinIO GitHub Repository](https://github.com/minio/minio)

## ✅ **Verification Checklist**

- [ ] MinIO image downloaded as tar
- [ ] Image loaded on target machine
- [ ] Container running successfully
- [ ] Console accessible at http://localhost:9001
- [ ] API accessible at http://localhost:9000
- [ ] Public and private buckets created
- [ ] Bucket policies configured
- [ ] Environment variables set
- [ ] Application can connect to MinIO

Your MinIO instance is now ready for offline use! 🎉 