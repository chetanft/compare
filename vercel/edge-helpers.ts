const DEFAULT_CORS_HEADERS = {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
    'Access-Control-Allow-Headers':
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
} as const;

type HeaderMap = Record<string, string>;

const mergeHeaders = (overrides: HeaderMap = {}, includeJson = false): HeaderMap => {
    const base: HeaderMap = { ...DEFAULT_CORS_HEADERS };

    if (includeJson) {
        base['Content-Type'] = 'application/json';
    }

    for (const [key, value] of Object.entries(overrides)) {
        base[key] = value;
    }

    return base;
};

export const corsResponse = (status = 200, headers: HeaderMap = {}) =>
    new Response(null, {
        status,
        headers: mergeHeaders(headers)
    });

export const jsonResponse = (data: unknown, status = 200, headers: HeaderMap = {}) =>
    new Response(JSON.stringify(data), {
        status,
        headers: mergeHeaders(headers, true)
    });

export const methodNotAllowed = (allowed: string[]) =>
    jsonResponse(
        {
            error: 'Method not allowed',
            allowedMethods: allowed
        },
        405
    );

export const parseJsonBody = async <T>(req: Request): Promise<T | null> => {
    try {
        return (await req.json()) as T;
    } catch {
        return null;
    }
};

export const getEnv = (key: string): string | undefined => {
    if (typeof process !== 'undefined' && process.env && key in process.env) {
        return process.env[key];
    }

    // Edge runtime doesn't guarantee process.env, but some environments polyfill it on globalThis
    const globalProcess = (globalThis as any)?.process;
    if (globalProcess?.env && key in globalProcess.env) {
        return globalProcess.env[key];
    }

    return undefined;
};
