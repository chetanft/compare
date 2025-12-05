# Supabase Setup Guide

This guide walks you through setting up Supabase for the Figma Web Comparison Tool.

## Prerequisites

- A Supabase account (sign up at https://supabase.com)
- Node.js 18+ installed
- npm or yarn package manager

## Step 1: Create a Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in your project details:
   - **Name**: Choose a name (e.g., "figma-comparison-tool")
   - **Database Password**: Create a strong password (save this securely)
   - **Region**: Choose the closest region to your users
   - **Pricing Plan**: Select Free tier for development
4. Click "Create new project"
5. Wait for the project to be provisioned (2-3 minutes)

## Step 2: Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`) - **Keep this secret!**

## Step 3: Deploy the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Open the file `supabase/schema.sql` from this project
4. Copy the entire contents and paste into the SQL Editor
5. Click "Run" (or press Cmd/Ctrl + Enter)
6. Verify the schema was created successfully:
   - Check the **Table Editor** - you should see:
     - `profiles`
     - `saved_credentials`
     - `comparisons`
     - `design_systems`
     - `extraction_cache`
     - `reports`

## Step 4: Configure Environment Variables

### Backend Configuration

1. Copy `env.example` to `.env` in the project root:
   ```bash
   cp env.example .env
   ```

2. Edit `.env` and add your Supabase credentials:
   ```env
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_KEY=your-service-role-key-here
   ```

### Frontend Configuration

The frontend uses Vite, which requires environment variables to be prefixed with `VITE_`:

1. Add these to your `.env` file (same file as above):
   ```env
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

**Important**: Never commit your `.env` file to version control. It's already in `.gitignore`.

## Step 5: Install Dependencies

Install the Supabase client in the frontend:

```bash
cd frontend
npm install
```

The backend already has `@supabase/supabase-js` installed.

## Step 6: Verify Installation

### Test Backend Connection

Start your server:
```bash
npm start
```

Look for this message in the console:
- ✅ `Supabase client initialized` - Success!
- ⚠️ `Supabase not configured` - Check your `.env` file

### Test Frontend Connection

1. Start the frontend dev server:
   ```bash
   cd frontend
   npm run dev
   ```

2. Open the browser console (F12)
3. Check for any Supabase-related errors
4. The app should load without errors even if Supabase isn't configured (graceful degradation)

## Step 7: Enable Authentication (Optional)

If you want to use Supabase authentication:

1. In Supabase dashboard, go to **Authentication** → **Providers**
2. Enable the providers you want (Email, Google, GitHub, etc.)
3. Configure email templates if needed
4. The app will automatically use Supabase Auth when configured

## Database Schema Overview

The schema includes:

- **profiles**: User profile information (extends Supabase auth.users)
- **saved_credentials**: Encrypted Figma API credentials (uses Supabase Vault)
- **comparisons**: Comparison history and results
- **design_systems**: Design token systems for FT-DS integration
- **extraction_cache**: Cached extraction results for performance
- **reports**: Generated comparison reports

All tables use Row Level Security (RLS) to ensure users can only access their own data.

## Troubleshooting

### "Supabase not configured" Warning

- Check that your `.env` file exists in the project root
- Verify environment variable names match exactly (case-sensitive)
- Restart your server after changing `.env`

### "Failed to create Supabase client" Error

- Verify your API keys are correct
- Check that your Supabase project is active
- Ensure your network can reach Supabase (check firewall)

### Schema Deployment Errors

- Make sure you're running the entire `schema.sql` file
- Check that the UUID extension is available (should be enabled by default)
- Verify you have the necessary permissions in your Supabase project

### Frontend Not Connecting

- Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- Restart the Vite dev server after changing environment variables
- Check browser console for specific error messages

## Security Notes

1. **Never commit `.env` files** - They contain sensitive keys
2. **Service Role Key** - Only use on the backend, never expose to frontend
3. **Anon Key** - Safe to expose in frontend (protected by RLS policies)
4. **Row Level Security** - All tables have RLS enabled for data protection

## Next Steps

- Set up authentication flows in your frontend
- Configure Supabase Storage for report files (if needed)
- Set up database backups in Supabase dashboard
- Configure email templates for auth emails

For more information, see the [Supabase Documentation](https://supabase.com/docs).

