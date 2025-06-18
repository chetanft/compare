# Port Management System

This document explains how port management works in the Figma-Web Comparison Tool and how to troubleshoot port-related issues.

## Overview

The application uses a centralized port management system to ensure that all components (backend server, frontend, WebSockets, etc.) use consistent port configurations. This prevents connection issues and simplifies deployment.

## Key Components

The port management system consists of several key components:

1. **Central Port Configuration** (`src/config/ports.js`): The single source of truth for all port settings.
2. **Server Startup Script** (`start-server.js`): Handles port selection, availability checking, and synchronization.
3. **Frontend Port Configuration** (`frontend/src/config/ports.ts`): Manages port settings for the frontend.
4. **Vite Configuration** (`frontend/vite.config.ts`): Configures API proxying based on the server port.
5. **Port Verification Tool** (`scripts/verify-ports.js`): Checks and fixes port consistency across all configuration files.

## Port Configuration Files

The following files contain port configurations that must be kept in sync:

1. `config.json`: Main configuration file with `ports.server` setting
2. `frontend/.env`: Environment variables for the frontend
3. `frontend/src/config/ports.ts`: TypeScript port configuration
4. `src/config/ports.js`: JavaScript port configuration for the backend

## Commands

The following npm scripts are available for port management:

- `npm run ports:check`: Check port consistency across all configuration files
- `npm run ports:fix`: Automatically fix port mismatches
- `npm run start:port XXXX`: Start the server on a specific port

## How It Works

1. When the server starts, it checks if the requested port is available.
2. If the port is in use, it automatically finds an available port.
3. The selected port is synchronized across all configuration files.
4. The frontend uses the Vite dev server's proxy to forward API requests to the backend port.
5. WebSocket connections are established directly to the backend port.

## Troubleshooting

### Connection Refused Errors

If you see `ERR_CONNECTION_REFUSED` errors in the browser console:

1. Check if the server is running: `curl http://localhost:3007/api/health`
2. Verify port consistency: `npm run ports:check`
3. Fix port mismatches: `npm run ports:fix`
4. Restart the server and frontend: `npm run dev`

### Port Already in Use

If you see "Port XXXX is in use" messages:

1. Find and stop the process using the port: `lsof -i :XXXX`
2. Or start the server on a different port: `npm run start:port YYYY`

### Frontend Can't Connect to Backend

If the frontend can't connect to the backend:

1. Check the browser console for connection errors
2. Verify the API proxy configuration in `frontend/vite.config.ts`
3. Check that the frontend is using the correct port in network requests
4. Run `npm run ports:fix` to ensure consistency

## Best Practices

1. Always use the `start-server.js` script to start the server
2. Use environment variables when you need to override port settings
3. Run `npm run ports:check` after making configuration changes
4. Use `npm run dev` to start both frontend and backend together

## Advanced Configuration

### Custom Port

To use a custom port:

```bash
npm run start:port 4000
```

### Environment Variables

You can set the following environment variables:

- `PORT`: Backend server port
- `VITE_SERVER_PORT`: Frontend server port for the backend
- `VITE_API_URL`: Full API URL (overrides port settings)
- `VITE_WS_URL`: WebSocket URL (overrides port settings)

Example:

```bash
PORT=4000 VITE_SERVER_PORT=4000 npm run dev
``` 