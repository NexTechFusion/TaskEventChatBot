# 🚀 Docker Quick Start Guide

Get your TaskEventChatBot running with Docker in 3 simple steps!

## Prerequisites

- Docker Desktop installed ([Download](https://www.docker.com/products/docker-desktop))
- OpenAI API Key ([Get one](https://platform.openai.com/api-keys))

## 🏃 Quick Start

### 1. Create Environment File

Create a `.env` file in the project root:

```bash
# Copy the example file
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:

```bash
OPENAI_API_KEY=sk-your-actual-api-key-here
POSTGRES_PASSWORD=your_secure_password
```

### 2. Start Everything

```bash
docker-compose up -d
```

This single command will:
- ✅ Build the frontend and backend
- ✅ Start PostgreSQL with pgvector
- ✅ Initialize the database
- ✅ Start all services

### 3. Access Your App

Open your browser to: **http://localhost**

The API is available at: **http://localhost:3001**

## 📝 Verify Installation

Check that all services are running:

```bash
docker-compose ps
```

You should see 3 services all "Up" and "healthy":
- taskbot-frontend
- taskbot-backend
- taskbot-database

## 🔍 View Logs

```bash
# All services
docker-compose logs -f

# Just the backend
docker-compose logs -f backend
```

## 🛑 Stop Everything

```bash
# Stop (data is preserved)
docker-compose down

# Stop and remove all data
docker-compose down -v
```

## 🔄 Make Changes

After editing code, rebuild:

```bash
docker-compose up -d --build
```

## ❓ Common Issues

### "Port already in use"

Change ports in `.env`:
```bash
FRONTEND_PORT=8080
BACKEND_PORT=3002
```

### "Backend can't connect to database"

Wait 30 seconds for database initialization, then:
```bash
docker-compose restart backend
```

### "OpenAI API error"

Check your API key in `.env` is correct:
```bash
docker-compose exec backend env | grep OPENAI_API_KEY
```

## 📚 Full Documentation

See [docker/README.md](./README.md) for complete documentation.

## 💡 Pro Tips

1. **First time setup takes 2-5 minutes** (building images)
2. **Subsequent starts are much faster** (30 seconds)
3. **Your data persists** between restarts
4. **Frontend automatically proxies API** requests

---

Need help? Check the logs: `docker-compose logs -f`

