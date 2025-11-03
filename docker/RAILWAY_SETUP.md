# Railway Deployment Guide

This guide explains how to deploy this application to Railway using Docker Compose or individual services.

## Prerequisites

- Railway account (sign up at [railway.app](https://railway.app))
- Railway CLI installed (optional, but recommended)
- Your OpenAI API key

## Deployment Options

**Note**: When using `docker-compose.railway.yml`, Railway will use the compose file for configuration. The `railway.json` file in the root is only used for individual service deployments (Option 2) and may be ignored when using Docker Compose.

### Option 1: Using Docker Compose (Recommended for Multi-Service)

Railway supports Docker Compose files. Use `docker-compose.railway.yml` for Railway deployment.

#### Steps:

1. **Create a new Railway project**
   - Go to Railway dashboard
   - Click "New Project"
   - Select "Deploy from GitHub repo" or upload your code
   - Railway will automatically detect `docker-compose.yml` in the root directory

2. **Railway Auto-Deploys Services**
   - Railway detects the `docker-compose.yml` file and creates services for:
     - `database` (PostgreSQL with pgvector)
     - `backend` (API server)
     - `frontend` (React app)
   - All 3 services will be deployed automatically from the compose file

3. **Configure Environment Variables**
   - Set `OPENAI_API_KEY` in Railway for the backend service
   - Optionally set `VITE_API_URL` for frontend (or let Railway auto-detect)
   - Database credentials will use defaults from the compose file

4. **Alternative: Use Railway's Managed PostgreSQL (Recommended)**
   - If you prefer Railway's managed PostgreSQL instead of the compose database:
     - Remove the `database` service from `docker-compose.yml` before deploying
   - Add PostgreSQL from Railway dashboard: "+ New" → "Database" → "PostgreSQL"
   - Link it to the backend service (Railway auto-injects connection variables)

5. **Manual Service Configuration (if Docker Compose isn't used)**
   - You can also configure services individually:
     - **Backend Service**: 
       - Build command: Uses `docker/backend.Dockerfile`
       - Environment variables: Set `OPENAI_API_KEY` and database variables (Railway auto-injects database vars)
     - **Frontend Service**:
       - Build command: Uses `docker/frontend.Dockerfile`
       - Environment variables: Set `VITE_API_URL` to your backend's Railway public URL

4. **Set Environment Variables**

   **Backend:**
   - `OPENAI_API_KEY`: Your OpenAI API key (required)
   - Database variables are auto-injected when PostgreSQL service is linked
   - `PORT`: Railway sets this automatically, defaults to 3001

   **Frontend:**
   - `VITE_API_URL`: Backend's public URL (e.g., `https://your-backend.railway.app`)
   - `PORT`: Railway sets this automatically, defaults to 80

5. **Deploy**
   - Railway will build and deploy automatically on git push
   - Monitor logs in Railway dashboard

### Option 2: Individual Services (Recommended for Flexibility)

Railway works best when deploying services individually. This gives you more control and better resource management.

#### Steps:

1. **Create PostgreSQL Database**
   - In Railway project: "+ New" → "Database" → "PostgreSQL"
   - Note the connection variables (auto-available to linked services)

2. **Deploy Backend Service**
   - "+ New" → "GitHub Repo" or "Empty Project"
   - **Root Directory**: Leave empty (uses project root)
   - **Build Command**: Railway will auto-detect Dockerfile at `docker/backend.Dockerfile` or use `railway.json` configuration
   - **Start Command**: Handled by Dockerfile (`node dist/server.js`)
   - **Note**: `railway.json` in the root directory configures this backend service if deploying individually
   - **Environment Variables**:
     ```
     OPENAI_API_KEY=your_key_here
     NODE_ENV=production
     ```
   - **Database**: Link the PostgreSQL service (Railway auto-injects connection vars)

3. **Deploy Frontend Service**
   - "+ New" → "GitHub Repo" or "Empty Project"
   - **Root Directory**: Leave empty
   - **Build Command**: Railway will auto-detect Dockerfile at `docker/frontend.Dockerfile`
   - **Start Command**: Handled by Dockerfile (nginx)
   - **Environment Variables**:
     ```
     VITE_API_URL=https://your-backend-service.railway.app
     ```
   - Railway will generate a public domain automatically

## Environment Variables Reference

### Backend Service

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `OPENAI_API_KEY` | OpenAI API key for AI features | Yes | - |
| `NODE_ENV` | Environment mode | Yes | `production` |
| `PORT` | Server port | No | `3001` |
| `DATABASE_URL` | PostgreSQL connection string | Auto (Railway) | - |
| `POSTGRES_HOST` | Database host | Auto (Railway) | - |
| `POSTGRES_PORT` | Database port | Auto (Railway) | `5432` |
| `POSTGRES_DB` | Database name | Auto (Railway) | - |
| `POSTGRES_USER` | Database user | Auto (Railway) | - |
| `POSTGRES_PASSWORD` | Database password | Auto (Railway) | - |

### Frontend Service

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `VITE_API_URL` | Backend API URL | Yes | - |
| `PORT` | Web server port | No | `80` |

## Important Notes

### Database Connection

Railway automatically injects database connection variables when you link a PostgreSQL service. The application will use:
- `DATABASE_URL` (full connection string)
- Or individual `POSTGRES_*` variables

No manual configuration needed for database connection!

### Port Configuration

- Railway automatically assigns ports via the `PORT` environment variable
- Your application should read from `process.env.PORT` (backend) or `$PORT` (frontend)
- The Dockerfiles are configured to use Railway's port assignment

### Public Domains

- Railway provides public domains automatically for each service
- Format: `https://<service-name>.<project-name>.railway.app`
- Use these URLs for `VITE_API_URL` in frontend configuration

### Health Checks

Both services include health check endpoints:
- Backend: `GET /health`
- Frontend: `GET /health` (via nginx)

Railway uses these for service monitoring.

## Troubleshooting

### Database Connection Issues

1. Ensure PostgreSQL service is linked to your backend service
2. Check that database variables are available in service environment
3. Verify `DATABASE_URL` or `POSTGRES_*` variables are set

### Build Failures

1. Check Railway build logs for specific errors
2. Ensure Dockerfiles are in the correct location (`docker/backend.Dockerfile`, `docker/frontend.Dockerfile`)
3. Verify all dependencies are in `package.json`

### Frontend Can't Reach Backend

1. Ensure `VITE_API_URL` is set to backend's Railway public URL
2. Check CORS configuration in backend (should allow Railway domain)
3. Verify both services are deployed and running

### Port Issues

1. Railway sets `PORT` automatically - don't hardcode port numbers
2. Ensure your application reads from `process.env.PORT`

## Recommended Railway Configuration

### Service Resources

- **Backend**: 
  - Minimum: 512MB RAM, 0.5 CPU
  - Recommended: 1GB RAM, 1 CPU
- **Frontend**: 
  - Minimum: 256MB RAM, 0.25 CPU
  - Recommended: 512MB RAM, 0.5 CPU
- **PostgreSQL**: 
  - Railway's default tier is sufficient for most use cases

### Custom Domains

Railway allows you to add custom domains:
1. Go to service settings
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Update `VITE_API_URL` if needed

## Continuous Deployment

Railway automatically deploys on:
- Push to connected GitHub repository
- Manual deployment trigger

Monitor deployments in the Railway dashboard.

## Cost Optimization

- Use Railway's free tier for development/testing
- Upgrade to Hobby plan for production ($5/month + usage)
- Monitor usage in Railway dashboard

