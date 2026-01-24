const DEFAULT_WEBSITE_BASE_URL = 'http://localhost:5174';
const DEFAULT_DASHBOARD_BASE_URL = 'http://localhost:5173';

function normalizeBaseUrl(url) {
    return String(url ?? '').replace(/\/$/, '');
}

function resolveExpectedAppBaseUrl() {
    if (process.env.VITE_APP_BASE_URL) {
        return normalizeBaseUrl(process.env.VITE_APP_BASE_URL);
    }

    const mode = process.env.PREFLIGHT_MODE ?? process.env.NODE_ENV ?? 'development';
    return mode === 'development'
        ? 'http://localhost:5173'
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
    const dashboardBaseUrl = normalizeBaseUrl(
        process.env.DASHBOARD_BASE_URL ?? DEFAULT_DASHBOARD_BASE_URL
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

    // Dashboard /about/build markers
    try {
        const url = `${dashboardBaseUrl}/about/build`;
        const { res, text } = await httpGet(url, { headers: preflightHeader });

        const hasVersionMarker = text.includes('data-preflight-marker="build-version"');
        const hasEnvMarker = text.includes('data-preflight-marker="build-env"');

        add(
            'dashboard GET /about/build -> markers present',
            res.status === 200 && hasVersionMarker && hasEnvMarker,
            `status=${res.status} versionMarker=${hasVersionMarker} envMarker=${hasEnvMarker}`
        );
    } catch (err) {
        add(
            'dashboard GET /about/build -> markers present',
            false,
            String(err?.message ?? err)
        );
    }

    // Dashboard /team/pitwall skeleton marker
    try {
        const url = `${dashboardBaseUrl}/team/pitwall`;
        const { res, text } = await httpGet(url, { headers: preflightHeader });

        const hasSkeleton = text.includes('SKELETON ONLY');
        add(
            'dashboard GET /team/pitwall -> skeleton marker',
            res.status === 200 && hasSkeleton,
            `status=${res.status} skeletonMarker=${hasSkeleton}`
        );
    } catch (err) {
        add(
            'dashboard GET /team/pitwall -> skeleton marker',
            false,
            String(err?.message ?? err)
        );
    }

    // Output table
    const nameWidth = Math.max(...checks.map((c) => c.name.length), 10);

    console.log('');
    console.log(`Website:   ${websiteBaseUrl}`);
    console.log(`Dashboard: ${dashboardBaseUrl}`);
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
