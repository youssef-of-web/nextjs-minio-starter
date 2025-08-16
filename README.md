# Next.js MinIO Starter

A modern file management application built with Next.js and MinIO object storage, featuring secure file uploads, file galleries, and secure URL generation.

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ and pnpm
- Git

### 1. Environment Setup

First, copy the environment files:

```bash
# Copy root environment file
cp .env.example .env

# Copy app-client environment file
cd app-client
cp .env.example .env
cd ..
```

### 2. Start MinIO Server

Start the MinIO server using Docker Compose:

```bash
docker compose up -d
```

This will start MinIO on `localhost:9001` with the MinIO Console on `localhost:9002`.

### 3. Generate MinIO Access Keys

1. Open your browser and visit [http://localhost:9002](http://localhost:9002)
2. Login with the default credentials:
   - Username: `minioadmin`
   - Password: `minioadmin`
3. Go to **Access Keys** in the left sidebar
4. Click **Create access key**
5. Copy the **Access Key** and **Secret Key**

### 4. Configure Environment Variables

Edit `app-client/.env` and update the MinIO credentials:

```env
# MinIO Configuration
MINIO_ENDPOINT=localhost
MINIO_PORT=9001
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=your_access_key_here
MINIO_SECRET_KEY=your_secret_key_here
MINIO_PUBLIC_BUCKET=public
MINIO_PRIVATE_BUCKET=private

# App Configuration
NEXTAUTH_SECRET=your_secret_here
NEXTAUTH_URL=http://localhost:3000
```

### 5. Install Dependencies & Setup Database

```bash
cd app-client

# Install dependencies
pnpm install

# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push
```

### 6. Start the Application

```bash
# Start the development server
pnpm dev
```

Your application will be available at [http://localhost:3000](http://localhost:3000)

## 🏗️ Project Structure

```
next-minio/
├── app-client/           # Next.js application
│   ├── app/             # App Router pages and API routes
│   ├── components/      # React components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility libraries and configurations
│   └── prisma/         # Database schema and migrations
├── docker-compose.yml   # MinIO and database services
└── README.md           # This file
```

## 🔧 Features

- **File Upload**: Drag & drop file upload with progress tracking
- **File Gallery**: Browse and manage uploaded files
- **Secure URLs**: Generate time-limited secure download links
- **File Management**: Delete files with confirmation
- **Responsive Design**: Mobile-friendly interface
- **MinIO Integration**: Object storage with bucket management

## 🐳 Docker Services

- **MinIO**: Object storage server (port 9001)
- **MinIO Console**: Web-based management interface (port 9002)
- **PostgreSQL**: Database for file metadata (port 5432)

## 📝 Environment Variables

### Root (.env)
```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=nextminio
```

### App Client (.env)
```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nextminio"

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9001
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=your_access_key
MINIO_SECRET_KEY=your_secret_key
MINIO_PUBLIC_BUCKET=public
MINIO_PRIVATE_BUCKET=private

# NextAuth
NEXTAUTH_SECRET=your_secret_here
NEXTAUTH_URL=http://localhost:3000
```

## 🚀 Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linting
pnpm lint

# Run type checking
pnpm type-check
```

## 📚 API Endpoints

- `POST /api/upload` - Upload files
- `GET /api/upload` - List uploaded files
- `DELETE /api/files/[id]` - Delete a file
- `GET /api/secure/[secureId]/[timestamp]/[hash]` - Secure file download

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Troubleshooting

### MinIO Connection Issues
- Ensure MinIO is running: `docker-compose ps`
- Check MinIO logs: `docker-compose logs minio`
- Verify access keys are correct in `.env`

### Database Issues
- Ensure PostgreSQL is running: `docker-compose ps`
- Check database logs: `docker-compose logs postgres`
- Verify DATABASE_URL in `.env`

### Port Conflicts
- Check if ports 3000, 9001, 9002, or 5432 are already in use
- Modify ports in `docker-compose.yml` if needed

## 🔗 Useful Links

- [Next.js Documentation](https://nextjs.org/docs)
- [MinIO Documentation](https://docs.min.io/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Docker Documentation](https://docs.docker.com/) 