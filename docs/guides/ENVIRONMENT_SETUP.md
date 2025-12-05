# Environment Setup Guide

This guide explains how to configure environment variables to replace hardcoded values in the Figma-Web Comparison Tool.

## 🔐 **Required Environment Variables**

### **Figma Configuration**
```bash
# Figma Personal Access Token (REQUIRED for production)
FIGMA_ACCESS_TOKEN=figd_your_actual_token_here

# Optional Figma Configuration
FIGMA_BASE_URL=https://api.figma.com
FIGMA_DEFAULT_FILE_ID=your_default_file_id
FIGMA_DEFAULT_NODE_ID=your_default_node_id
```

### **Server Configuration**
```bash
# Server Settings
PORT=3004
HOST=localhost

# MCP Server Configuration
MCP_SERVER_URL=http://127.0.0.1:3845
MCP_ENDPOINT=/sse
```

### **Application Environment**
```bash
# Environment Type
NODE_ENV=development  # or 'production' or 'test'

# Output Directories
REPORT_DIR=./output/reports
SCREENSHOT_DIR=./output/screenshots
IMAGE_DIR=./output/images
```

### **Security Configuration**
```bash
# Security Settings (REQUIRED for production)
SESSION_SECRET=your_secure_session_secret_here
CORS_ORIGIN=*  # or specific domain for production
RATE_LIMIT_MAX=100
```

### **Testing Configuration**
```bash
# Test Environment
TEST_SERVER_URL=http://localhost:3004
TEST_PASSWORD=secure-test-password
MOCK_WEB_URL=https://example.com
MOCK_LOGIN_URL=https://example.com/login
```

## 🚀 **Setup Instructions**

### **1. Create Environment File**
Create a `.env` file in your project root:

```bash
# Copy this template and fill in your values
cp .env.example .env
```

### **2. Get Figma Access Token**
1. Visit [Figma Developer Settings](https://www.figma.com/developers/api#access-tokens)
2. Click "Generate new token"
3. Copy the token (starts with "figd_")
4. Add to your `.env` file:
   ```bash
   FIGMA_ACCESS_TOKEN=figd_your_actual_token_here
   ```

### **3. Configure MCP Server (Optional)**
If using MCP server instead of direct API:
```bash
MCP_SERVER_URL=http://127.0.0.1:3845
MCP_ENDPOINT=/sse
```

### **4. Set Production Security**
For production deployment:
```bash
NODE_ENV=production
SESSION_SECRET=your_very_secure_random_string_here
CORS_ORIGIN=https://yourdomain.com
```

## 🔧 **Configuration Priority**

The application uses this priority order:
1. **Environment Variables** (highest priority)
2. **config.json** (fallback)
3. **Default values** (lowest priority)

## 📝 **Environment File Template**

Create `.env` file with these variables:

```bash
# ===========================================
# FIGMA-WEB COMPARISON TOOL - ENVIRONMENT CONFIG
# ===========================================

# Figma Configuration
FIGMA_ACCESS_TOKEN=
FIGMA_BASE_URL=https://api.figma.com
FIGMA_DEFAULT_FILE_ID=
FIGMA_DEFAULT_NODE_ID=

# Server Configuration
PORT=3004
HOST=localhost
MCP_SERVER_URL=http://127.0.0.1:3845
MCP_ENDPOINT=/sse

# Application Environment
NODE_ENV=development
REPORT_DIR=./output/reports
SCREENSHOT_DIR=./output/screenshots
IMAGE_DIR=./output/images

# Security (CHANGE IN PRODUCTION!)
SESSION_SECRET=development-secret-change-in-production
CORS_ORIGIN=*
RATE_LIMIT_MAX=100

# Testing
TEST_SERVER_URL=http://localhost:3004
TEST_PASSWORD=secure-test-password
MOCK_WEB_URL=https://example.com
MOCK_LOGIN_URL=https://example.com/login
```

## ⚠️ **Security Notes**

1. **Never commit `.env` files** to version control
2. **Rotate tokens regularly** in production
3. **Use strong session secrets** in production
4. **Restrict CORS origins** in production
5. **Monitor API usage** to detect token misuse

## 🔍 **Validation**

The application will validate environment variables on startup:
- **Development**: Warnings for missing variables
- **Production**: Errors for required variables

## 🆘 **Troubleshooting**

### **"No Figma access method configured"**
- Set `FIGMA_ACCESS_TOKEN` environment variable
- Or enable MCP server in config.json

### **"Environment validation failed"**
- Check required variables are set
- Verify token format (starts with "figd_")
- Ensure NODE_ENV is set correctly

### **"MCP connection failed"**
- Verify MCP server is running
- Check MCP_SERVER_URL and MCP_ENDPOINT
- Test connection manually

## 📚 **Related Documentation**

- [Figma API Documentation](https://www.figma.com/developers/api)
- [MCP Server Setup](./MCP_SETUP.md)
- [Security Best Practices](./SECURITY.md) 