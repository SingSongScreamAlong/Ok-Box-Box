/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(
    readFileSync(new URL('./package.json', import.meta.url), 'utf-8')
) as { version?: string };

const gitCommit =
    process.env.GIT_COMMIT ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.GITHUB_SHA ??
    'UNKNOWN';

function preflightProbePlugin(version: string) {
    return {
        name: 'okboxbox-preflight-probe',
        configureServer(server: any) {
            server.middlewares.use((req: any, res: any, next: any) => {
                const wantPreflight = req.headers?.['x-okboxbox-preflight'] === '1';

                if (!wantPreflight) {
                    next();
                    return;
                }

                const url = req.url;
                const env = server.config?.mode ?? 'unknown';

                if (url === '/about/build') {
                    const html = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>About Build (Preflight)</title></head>
  <body>
    <div data-preflight-marker="build-version">${version}</div>
    <div data-preflight-marker="build-env">${env}</div>
  </body>
</html>`;
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'text/html; charset=utf-8');
                    res.end(html);
                    return;
                }

                if (url === '/team/pitwall') {
                    const html = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Pitwall (Preflight)</title></head>
  <body>
    <div data-preflight-marker="pitwall-skeleton">SKELETON ONLY</div>
  </body>
</html>`;
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'text/html; charset=utf-8');
                    res.end(html);
                    return;
                }

                next();
            });
        },
    };
}

export default defineConfig({
    plugins: [preflightProbePlugin(pkg.version ?? 'UNKNOWN'), react()],
    define: {
        __APP_VERSION__: JSON.stringify(pkg.version ?? 'UNKNOWN'),
        __GIT_COMMIT__: JSON.stringify(gitCommit),
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
            '/socket.io': {
                target: 'http://localhost:3001',
                ws: true,
            },
        },
    },
    // @ts-ignore - Vitest config
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test-setup.ts'],
        include: ['src/**/*.test.{ts,tsx}'],
    },
});
