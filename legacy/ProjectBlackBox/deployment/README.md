# Project PitBox Deployment

## Server Deployment

This directory contains all the necessary files to deploy Project PitBox on a DigitalOcean Droplet or any other server with Docker support.

### System Requirements

- DigitalOcean Droplet (Basic $4/month, 1GB RAM, 1vCPU)
- Docker and Docker Compose
- Ubuntu 20.04 LTS or newer

### Directory Structure

```
deployment/
├── backend/             # Express API server
│   ├── Dockerfile       # Backend Docker configuration
│   ├── package.json     # Node.js dependencies
│   ├── server.js        # Main server code
│   └── .env.example     # Example environment variables
├── frontend/            # React dashboard
│   ├── Dockerfile       # Frontend Docker configuration
│   ├── package.json     # Node.js dependencies
│   ├── src/             # React source code
│   └── nginx/           # Nginx configuration for frontend
├── nginx/               # Main Nginx reverse proxy
│   └── nginx.conf       # Nginx configuration
├── docker-compose.yml   # Docker Compose configuration
└── README.md            # This file
```

### Deployment Instructions

#### 1. Prepare Your Server

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install -y docker-compose

# Create deployment directory
mkdir -p ~/pitbox
```

#### 2. Upload Files

Upload all files in this directory to your server using SCP, SFTP, or Git:

```bash
# Example using SCP (run from your local machine)
scp -r ./deployment/* user@your-server-ip:~/pitbox/
```

#### 3. Configure Environment Variables

```bash
# Navigate to the deployment directory
cd ~/pitbox

# Create backend .env file from example
cp backend/.env.example backend/.env

# Edit the .env file with your settings
nano backend/.env
```

#### 4. Start the Services

```bash
# Start all services in detached mode
docker-compose up -d

# Check if all services are running
docker-compose ps
```

#### 5. Access the Application

Once deployed, you can access the application at:

- Dashboard: http://your-server-ip/
- API: http://your-server-ip/api/
- Status: http://your-server-ip/status

### Maintenance

#### Viewing Logs

```bash
# View logs from all services
docker-compose logs

# View logs from a specific service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs nginx

# Follow logs in real-time
docker-compose logs -f
```

#### Updating the Application

```bash
# Pull latest changes (if using Git)
git pull

# Rebuild and restart services
docker-compose down
docker-compose build
docker-compose up -d
```

#### Backup Data

The backend data is stored in a Docker volume. To backup:

```bash
# Create a backup directory
mkdir -p ~/backups

# Backup the volume data
docker run --rm -v pitbox_backend_data:/data -v ~/backups:/backup alpine tar -czf /backup/pitbox-data-$(date +%Y%m%d).tar.gz /data
```

### Troubleshooting

#### Service Not Starting

Check the logs for errors:

```bash
docker-compose logs [service_name]
```

#### Connection Issues

Ensure ports are open in your firewall:

```bash
sudo ufw allow 80/tcp
```

#### Resource Limitations

Monitor resource usage:

```bash
docker stats
```

If you're hitting resource limits, consider upgrading your Droplet or optimizing the application configuration.

### Security Considerations

- The default setup uses HTTP. For production, consider adding HTTPS with Let's Encrypt.
- Review and restrict CORS settings in the backend .env file.
- Consider adding authentication for the API endpoints.
- Regularly update dependencies and Docker images.

## Driver App Deployment

This section provides instructions for deploying the PitBox Driver App for development, testing, and production environments.

### Prerequisites

- Node.js 16+ and npm 8+
- Electron 22+
- Git

### Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/SingSongScreamAlong/pitboxdriverapp.git
   cd pitboxdriverapp/driver_app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. For testing with a mock backend:
   ```bash
   # In a separate terminal
   cd mock_server
   npm install
   npm start
   ```

### Building for Production

#### Build for all platforms:
```bash
npm run build
npm run package
```

#### Platform-specific builds:
```bash
# Windows
npm run package:win

# macOS
npm run package:mac

# Linux
npm run package:linux
```

### Installer Creation

The Driver App uses Electron Builder to create installers for various platforms:

```bash
# Create all installers
npm run make

# Platform-specific installers
npm run make:win
npm run make:mac
npm run make:linux
```

### Configuration

The Driver App can be configured using the following methods:

1. **Config file**: Located at `%APPDATA%/pitbox-driver/config.json` (Windows) or `~/Library/Application Support/pitbox-driver/config.json` (macOS)

2. **Command line arguments**:
   ```bash
   pitbox-driver --server=https://your-server.com --telemetry-rate=60
   ```

3. **Environment variables**:
   ```bash
   BLACKBOX_SERVER_URL=https://your-server.com BLACKBOX_TELEMETRY_RATE=60 pitbox-driver
   ```

### Deployment Workflow

#### 1. Development
- Make changes to the codebase
- Run tests: `npm test`
- Verify functionality: `npm run dev`

#### 2. Staging
- Build the application: `npm run build`
- Package for testing: `npm run package`
- Deploy to staging environment
- Perform integration testing

#### 3. Production
- Create release branch
- Build production version: `npm run build:prod`
- Create installers: `npm run make`
- Sign installers (see below)
- Publish to distribution channels

### Code Signing

#### Windows
```bash
npm run sign:win -- --cert=path/to/certificate.pfx --password=your-password
```

#### macOS
```bash
npm run sign:mac -- --identity="Developer ID Application: Your Name (TEAM_ID)"
```

### Continuous Integration

The Driver App uses GitHub Actions for CI/CD. The workflow is defined in `.github/workflows/build.yml`.

- **Pull Request**: Runs tests and builds the application
- **Release**: Creates installers and publishes to distribution channels

### Troubleshooting

- **Build errors**: Check Node.js version and dependencies
- **Packaging errors**: Verify Electron Builder configuration
- **Runtime errors**: Check logs at `%APPDATA%/pitbox-driver/logs` (Windows) or `~/Library/Logs/pitbox-driver` (macOS)

## Support

For issues or questions, please refer to the project documentation or open an issue in the project repository.

For deployment issues, contact the PitBox DevOps team at devops@pitbox-racing.com
