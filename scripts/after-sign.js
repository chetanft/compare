import path from 'node:path';
import fs from 'node:fs';
import { notarize } from '@electron/notarize';

/**
 * Electron Builder afterSign hook.
 * Performs notarization with Apple's notarytool when credentials are present.
 */
export default async function notarizeIfNeeded(context) {
  const { electronPlatformName, appOutDir, packager } = context;

  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_ID_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) {
    console.warn('[notarize] Skipping notarization: APPLE_ID, APPLE_ID_PASSWORD, or APPLE_TEAM_ID missing.');
    return;
  }

  const appName = packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);

  if (!fs.existsSync(appPath)) {
    throw new Error(`[notarize] Could not find app bundle at ${appPath}`);
  }

  const appBundleId = packager.appInfo.appId;

  console.log(`[notarize] Submitting ${appBundleId} for notarization via notarytool...`);

  await notarize({
    appBundleId,
    appPath,
    appleId,
    appleIdPassword,
    teamId,
    tool: 'notarytool',
  });

  console.log('[notarize] Notarization request completed.');
}

