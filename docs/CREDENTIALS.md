# Credentials Vault Guide

## Overview

The Credentials Vault allows you to securely store and reuse authentication credentials for web extractions.

## Features

- **Encrypted Storage**: Username and password are encrypted
- **Auto-fill**: Credentials can be auto-filled in comparison forms
- **Last Used Tracking**: See when credentials were last used
- **Multi-credential Support**: Store multiple credentials for different sites

## Creating Credentials

1. Go to Settings → Credentials
2. Click "Add Credential"
3. Fill in:
   - **Name**: Display name (e.g., "Production Site")
   - **URL**: Target website URL
   - **Username**: Login username
   - **Password**: Login password
   - **Notes**: Optional notes

## Using Saved Credentials

### In Comparison Form

1. Start a new comparison
2. Select "Login" authentication type
3. Choose a saved credential from the dropdown
4. Fields will auto-fill automatically

### Security

- Credentials are encrypted server-side
- Passwords stored in Supabase Vault (preferred) or encrypted column
- Never exposed to browser (decryption happens server-side only)
- RLS policies ensure users can only access their own credentials

## Encryption Details

- **Algorithm**: AES-256-GCM
- **Key Derivation**: PBKDF2 with random salt
- **Password Storage**: Supabase Vault (encrypted at rest) or encrypted column
- **Master Key**: Derived from environment or user session

## Best Practices

1. Use descriptive names for easy identification
2. Add notes for context (e.g., "Staging environment")
3. Regularly review and delete unused credentials
4. Never share credentials between users
5. Use strong, unique passwords

## Limitations

- Desktop mode: Credentials not available (Supabase required)
- SaaS mode: Full credential management available
- Credentials are user-scoped (cannot share between users)
