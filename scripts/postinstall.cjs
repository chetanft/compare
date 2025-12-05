const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Check if we are running on Vercel
if (process.env.VERCEL) {
    console.log('Skipping electron-builder install-app-deps on Vercel deployment.');
    process.exit(0);
}

// Check if electron-builder is available
try {
    // We use npx to ensure we use the local version or download if missing (though it should be in devDeps)
    // Actually, since it's a devDep, it might not be installed in production environment if NODE_ENV=production
    // But for local dev, it should be there.

    // If we are in a production environment (not Vercel, but maybe a server), we might not want to run this either
    // unless we are explicitly building the electron app.
    // But the user has it in postinstall, so they probably want it for local dev.

    console.log('Running electron-builder install-app-deps...');
    execSync('electron-builder install-app-deps', { stdio: 'inherit' });
} catch (error) {
    console.error('Failed to run electron-builder install-app-deps.');
    console.error(error.message);
    // We don't exit with error to avoid breaking npm install in some environments
    // where electron-builder might have issues but the web app is fine.
    // But for local dev, we might want to know.
    // Given the current issue is Vercel, and we skipped it above, this catch block is for other cases.
    // We'll warn but exit 0 to be safe.
    process.exit(0);
}
