# MCP Setup Guide

## Overview

The application supports two MCP connection modes:
- **Local MCP**: Connects to Figma Desktop App's MCP server
- **Remote MCP**: Connects to Figma's remote MCP service (SaaS)

## Local MCP (Desktop)

### Requirements
- Figma Desktop App installed and running
- MCP server enabled in Figma Desktop App

### Configuration
1. Open Figma Desktop App
2. Enable MCP server (usually runs on `http://127.0.0.1:3845/mcp`)
3. Application auto-detects local MCP server

### Usage
- No authentication required
- Works offline
- Direct connection to local Figma instance

## Remote MCP (SaaS)

### Requirements
- Figma Personal Access Token
- Supabase configured (for token storage)

### Configuration
1. Get Figma Personal Access Token:
   - Go to Figma → Settings → Account
   - Generate Personal Access Token
2. Configure in Settings:
   - Go to Settings → Figma Integration
   - Select "MCP Server - Remote (SaaS)"
   - Enter Figma token

### Usage
- Requires internet connection
- Token stored securely (Supabase Vault or env var)
- Works in SaaS deployments

## Switching Modes

### Desktop App
- Default: Local MCP
- Can switch to Remote if Supabase configured
- Settings → Figma Integration → Connection Method

### SaaS Deployment
- Default: Remote MCP
- Local MCP not available (no desktop app)

## Troubleshooting

### Local MCP Not Connecting
1. Verify Figma Desktop App is running
2. Check MCP server is enabled
3. Verify port 3845 is not blocked
4. Check firewall settings

### Remote MCP Not Connecting
1. Verify Figma token is valid
2. Check token has required permissions
3. Verify Supabase is configured
4. Check network connectivity

### Token Storage
- Desktop: Stored in environment variable or config file
- SaaS: Stored in Supabase Vault (encrypted)
- Never exposed to browser (server-side only)

## API Endpoints

### MCP Proxy
- `POST /api/mcp/proxy`: Proxy MCP calls (SaaS only)
- Requires authentication
- Prevents tokens from reaching browser

### MCP Status
- `GET /api/mcp/status`: Check MCP connection status
- Returns connection state and available tools
