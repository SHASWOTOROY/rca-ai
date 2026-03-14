# RCA Report Analysis Generator

A professional 3-tier architecture application for Root Cause Analysis (RCA) report generation using AI integration.

## Architecture

- **Presentation Layer**: React single-page application with Material-UI
- **Application Layer**: Node.js Express API backend and Python AI service
- **Data Layer**: PostgreSQL database

## Features

- Upload log files or input error codes
- AI-powered iterative analysis and solution suggestions
- Generate comprehensive RCA reports
- Download reports as PDF
- Secure and fast API responses
- Eye-catching, professional UI

## Setup

1. **Database**: Run the SQL script in `database/schema.sql` in pgAdmin (PostgreSQL running on port 5433 to avoid XAMPP conflicts)
2. **Backend**: `cd backend && npm install && npm start`
3. **AI Service**: `cd ai-service && venv\Scripts\activate && python app.py`
4. **Frontend**: `cd frontend && npm install && npm run dev`

## Environment Variables

- Backend: Create `.env` file in `backend/` with DB credentials and JWT secret
- AI Service: Create `.env` file in `ai-service/` with OpenAI API key

## Technologies

- Frontend: React, Vite, Material-UI, Axios, jsPDF
- Backend: Node.js, Express, PostgreSQL, JWT, Multer
- AI: Python, Flask, OpenAI API
- Database: PostgreSQL

## Ports Used

- Frontend: 5173+ (Vite dev server)
- Backend API: 3001
- AI Service: 5000
- PostgreSQL: 5433 (changed from default 5432 to avoid XAMPP conflicts)

## Docker Deployment

### Prerequisites
- Docker and Docker Compose installed
- OpenAI API key

### Quick Start with Docker

1. **Clone and navigate to the project directory**
   ```bash
   cd rca_project
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env and add your OPENAI_API_KEY
   ```

3. **Build and run all services**
   ```bash
   docker-compose up --build
   ```

4. **Access the application**
   - Frontend: http://localhost
   - API: http://localhost/api
   - Admin interface: http://localhost:8080 (Nginx)

### Docker Services

- **frontend**: React SPA served by Nginx (port 80)
- **backend**: Node.js Express API (port 3001)
- **ai-service**: Python Flask AI service (port 5000)
- **postgres**: PostgreSQL database (port 5433)
- **nginx**: Reverse proxy for production (port 8080)

### Docker Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up --build

# View logs
docker-compose logs -f

# Scale services
docker-compose up -d --scale backend=3
```

### Production Deployment

For production deployment, use the Nginx service (port 8080) which provides:
- Load balancing
- SSL termination (configure certificates)
- Static file caching
- Security headers
- Gzip compression