const DEFAULT_WEBSITE_BASE_URL = 'http://localhost:5174';
const DEFAULT_APP_BASE_URL = 'http://localhost:5175';

function normalizeBaseUrl(url) {
    return String(url ?? '').replace(/\/$/, '');
}

function resolveExpectedAppBaseUrl() {
    if (process.env.VITE_APP_BASE_URL) {
        return normalizeBaseUrl(process.env.VITE_APP_BASE_URL);
    }

    const mode = process.env.PREFLIGHT_MODE ?? process.env.NODE_ENV ?? 'development';
    return mode === 'development'
        ? 'http://localhost:5175'
        : 'https://app.okboxbox.com';
}

async function httpGet(url, { redirect = 'follow', headers } = {}) {
    const res = await fetch(url, {
        method: 'GET',
        redirect,
        headers,
    });

    const text = await res.text();
    return { res, text };
}

function formatStatus(ok) {
    return ok ? 'PASS' : 'FAIL';
}

function pad(str, len) {
    const s = String(str);
    if (s.length >= len) return s;
    return s + ' '.repeat(len - s.length);
}

async function run() {
    const websiteBaseUrl = normalizeBaseUrl(
        process.env.WEBSITE_BASE_URL ?? DEFAULT_WEBSITE_BASE_URL
    );
    const appBaseUrl = normalizeBaseUrl(
        process.env.APP_BASE_URL ?? DEFAULT_APP_BASE_URL
    );

    const preflightHeader = { 'x-okboxbox-preflight': '1' };

    const expectedAppBaseUrl = resolveExpectedAppBaseUrl();
    const expectedLoginLocation = `${expectedAppBaseUrl}/login`;

    const checks = [];

    const add = (name, ok, details = '') => {
        checks.push({ name, ok, details });
    };

    // Website 200s
    for (const path of ['/', '/pricing', '/download-relay', '/docs']) {
        const url = `${websiteBaseUrl}${path}`;
        try {
            const { res } = await httpGet(url);
            add(`website GET ${path} -> 200`, res.status === 200, `status=${res.status}`);
        } catch (err) {
            add(`website GET ${path} -> 200`, false, String(err?.message ?? err));
        }
    }

    // Website /login 302 + Location
    try {
        const url = `${websiteBaseUrl}/login`;
        const { res } = await httpGet(url, { redirect: 'manual' });
        const loc = res.headers.get('location');
        const ok = res.status === 302 && loc === expectedLoginLocation;
        add(
            'website GET /login -> 302 Location',
            ok,
            `status=${res.status} location=${loc} expected=${expectedLoginLocation}`
        );
    } catch (err) {
        add('website GET /login -> 302 Location', false, String(err?.message ?? err));
    }

    // App shell routes
    try {
        const url = `${appBaseUrl}/login`;
        const { res } = await httpGet(url, { headers: preflightHeader });
        add('app GET /login -> 200', res.status === 200, `status=${res.status}`);
    } catch (err) {
        add(
            'app GET /login -> 200',
            false,
            String(err?.message ?? err)
        );
    }

    try {
        const url = `${appBaseUrl}/pricing`;
        const { res } = await httpGet(url, { headers: preflightHeader });
        add('app GET /pricing -> 200', res.status === 200, `status=${res.status}`);
    } catch (err) {
        add(
            'app GET /pricing -> 200',
            false,
            String(err?.message ?? err)
        );
    }

    try {
        const url = `${appBaseUrl}/download`;
        const { res } = await httpGet(url, { headers: preflightHeader });
        add('app GET /download -> 200', res.status === 200, `status=${res.status}`);
    } catch (err) {
        add(
            'app GET /download -> 200',
            false,
            String(err?.message ?? err)
        );
    }

    // Output table
    const nameWidth = Math.max(...checks.map((c) => c.name.length), 10);

    console.log('');
    console.log(`Website:   ${websiteBaseUrl}`);
    console.log(`App:       ${appBaseUrl}`);
    console.log(`Expected Login Location: ${expectedLoginLocation}`);
    console.log('');

    console.log(`${pad('CHECK', nameWidth)}  ${pad('RESULT', 6)}  DETAILS`);
    console.log(`${'-'.repeat(nameWidth)}  ------  -------`);

    for (const c of checks) {
        console.log(`${pad(c.name, nameWidth)}  ${pad(formatStatus(c.ok), 6)}  ${c.details}`);
    }

    const failed = checks.filter((c) => !c.ok);
    console.log('');

    if (failed.length) {
        console.log(`PRE-FLIGHT: FAIL (${failed.length}/${checks.length} failed)`);
        process.exitCode = 1;
        return;
    }

    console.log(`PRE-FLIGHT: PASS (${checks.length}/${checks.length})`);
}

run().catch((err) => {
    console.error('PRE-FLIGHT: ERROR', err);
    process.exit(1);
});
