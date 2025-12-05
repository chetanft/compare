/**
 * Generic Authentication Handler Module
 * Handles standard login form authentication for web apps
 */

/**
 * Handle standard user authentication
 * @param {Object} page - Puppeteer page object
 * @param {Object} auth - Authentication credentials and options
 */
export async function handleAuthentication(page, auth) {
    console.log('🔐 Starting authentication process...');

    try {
        // Detect login page type
        const loginType = await detectLoginPageType(page);
        console.log(`📋 Detected login type: ${loginType}`);

        if (loginType === 'form') {
            await handleFormLogin(page, auth);
        } else if (loginType === 'oauth') {
            console.log('⚠️ OAuth login detected - may require manual intervention');
        } else {
            // Try generic form detection
            await handleFormLogin(page, auth);
        }

    } catch (error) {
        console.warn(`⚠️ Authentication failed: ${error.message}`);
    }
}

/**
 * Detect the type of login page
 * @param {Object} page - Puppeteer page object
 * @returns {string} Login type: 'form', 'oauth', or 'unknown'
 */
async function detectLoginPageType(page) {
    return await page.evaluate(() => {
        const hasOAuth = document.querySelector('[class*="oauth"], [class*="google"], [class*="sso"]');
        const hasForm = document.querySelector('form, input[type="password"]');

        if (hasOAuth && !hasForm) return 'oauth';
        if (hasForm) return 'form';
        return 'unknown';
    });
}

/**
 * Handle standard form-based login
 * @param {Object} page - Puppeteer page object
 * @param {Object} auth - Authentication credentials
 */
async function handleFormLogin(page, auth) {
    const usernameSelectors = [
        '#username', '#userName', '#user-name', '#email', '#user_name',
        'input[name="username"]', 'input[name="userName"]', 'input[name="email"]',
        'input[placeholder*="username" i]', 'input[placeholder*="email" i]',
        'input[type="text"]:not([hidden])', 'input[type="email"]'
    ];

    const passwordSelectors = [
        '#password', '#Password', '#pass', '#pwd', '#user_password',
        'input[name="password"]', 'input[name="Password"]',
        'input[placeholder*="password" i]', 'input[type="password"]'
    ];

    // Find and fill username
    const usernameField = await findFirstAvailable(page, usernameSelectors);
    if (usernameField) {
        await page.click(usernameField);
        await page.type(usernameField, auth.username || auth.credentials?.username || '', { delay: 50 });
        console.log('✅ Username filled');
    }

    // Find and fill password
    const passwordField = await findFirstAvailable(page, passwordSelectors);
    if (passwordField) {
        await page.click(passwordField);
        await page.type(passwordField, auth.password || auth.credentials?.password || '', { delay: 50 });
        console.log('✅ Password filled');
    }

    // Submit the form
    await submitLoginForm(page);

    // Wait for authentication result
    await waitForAuthResult(page);
}

/**
 * Find first available selector from a list
 * @param {Object} page - Puppeteer page object
 * @param {string[]} selectors - Array of selectors to try
 * @returns {string|null} First matching selector or null
 */
async function findFirstAvailable(page, selectors) {
    for (const selector of selectors) {
        try {
            await page.waitForSelector(selector, { timeout: 2000 });
            return selector;
        } catch (_) {
            continue;
        }
    }
    return null;
}

/**
 * Submit the login form using various strategies
 * @param {Object} page - Puppeteer page object
 */
async function submitLoginForm(page) {
    const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        '.login-button',
        '[class*="login-btn"]',
        '[class*="submit-btn"]'
    ];

    // Try clicking submit button
    for (const selector of submitSelectors) {
        try {
            await page.waitForSelector(selector, { timeout: 2000 });
            await page.click(selector);
            console.log(`✅ Clicked submit button: ${selector}`);
            return;
        } catch (_) {
            continue;
        }
    }

    // Try finding button by text
    const clicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const loginBtn = buttons.find(btn =>
            btn.textContent?.toLowerCase().includes('login') ||
            btn.textContent?.toLowerCase().includes('sign in')
        );
        if (loginBtn) {
            loginBtn.click();
            return true;
        }
        return false;
    });

    if (clicked) {
        console.log('✅ Clicked login button by text');
        return;
    }

    // Fallback: press Enter on password field
    try {
        await page.keyboard.press('Enter');
        console.log('✅ Submitted using Enter key');
    } catch (_) {
        console.warn('⚠️ Could not submit form');
    }
}

/**
 * Wait for authentication result
 * @param {Object} page - Puppeteer page object
 */
async function waitForAuthResult(page) {
    console.log('⏳ Waiting for authentication result...');

    try {
        await Promise.race([
            // URL change (redirected away from login)
            page.waitForFunction(() => !window.location.href.includes('/login'), { timeout: 15000 }),
            // Login form disappears
            page.waitForFunction(() => !document.querySelector('input[type="password"]'), { timeout: 15000 }),
            // Dashboard elements appear
            page.waitForSelector('[class*="dashboard"], .main-content, .app-content', { timeout: 15000 })
        ]);
        console.log('✅ Authentication appears successful');
    } catch (_) {
        console.log('⚠️ Authentication result uncertain - continuing...');
    }
}
