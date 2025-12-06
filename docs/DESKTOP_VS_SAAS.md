# Desktop vs SaaS Feature Comparison

## Storage

| Feature | Desktop | SaaS |
|---------|---------|------|
| Reports | Local filesystem | Supabase Storage |
| Screenshots | Local filesystem | Supabase Storage |
| Design Systems | Local JSON files | Supabase database + Storage |
| Credentials | Not available | Supabase (encrypted) |
| Authentication | Optional | Required |

## MCP Connection

| Mode | Desktop | SaaS |
|------|---------|------|
| Default | Local MCP (`127.0.0.1:3845`) | Remote MCP (`mcp.figma.com`) |
| Authentication | Not required | Figma token required |
| Configuration | Auto-detected | Settings toggle |

## Data Sync

| Feature | Desktop | SaaS |
|---------|---------|------|
| Offline Support | Full | Limited (cached data only) |
| Multi-device Sync | No (unless Supabase configured) | Yes (via Supabase) |
| Data Persistence | Local only | Cloud + local cache |

## Authentication

| Feature | Desktop | SaaS |
|---------|---------|------|
| Required | No | Yes |
| Sign In | Optional (if Supabase configured) | Required |
| Session | Local storage | Supabase Auth |
| User Isolation | N/A (single user) | RLS enforced |

## Credentials Management

| Feature | Desktop | SaaS |
|---------|---------|------|
| Save Credentials | No | Yes |
| Encryption | N/A | AES-256-GCM + Vault |
| Auto-fill | No | Yes |
| Multi-user | No | Yes (isolated) |

## Design Systems

| Feature | Desktop | SaaS |
|---------|---------|------|
| Storage | Local JSON | Supabase database |
| CSS Support | Local files | Storage or inline |
| Global Systems | No | Yes |
| Figma Integration | No | Yes (file key + node ID) |

## Setup Requirements

### Desktop
- Node.js runtime
- Optional: Supabase credentials for sync

### SaaS
- Supabase project
- Environment variables:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_KEY` (server-side)
- Figma Personal Access Token (for remote MCP)
