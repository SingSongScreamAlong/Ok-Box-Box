import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath, URL } from 'node:url';

function resolveAppBaseUrl() {
    const configured = process.env.VITE_APP_BASE_URL?.replace(/\/$/, '');
    if (configured) {
        return configured;
    }

    return process.env.NODE_ENV === 'production'
        ? 'https://app.okboxbox.com'
        : 'http://localhost:5175';
}

function loginRedirectPlugin() {
    const appBaseUrl = resolveAppBaseUrl();
    return {
        name: 'okboxbox-login-redirect',
        configureServer(server: any) {
            server.middlewares.use((req: any, res: any, next: any) => {
                if (req.url === '/login') {
                    const location = `${appBaseUrl}/login`;

                    res.statusCode = 302;
                    res.setHeader('Location', location);
                    res.end();
                    return;
                }

                next();
            });
        },
    };
}

export default defineConfig({
    plugins: [loginRedirectPlugin(), react()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    server: {
        port: 5174, // Distinct from dashboard (5173) and legacy (3000/3005)
    },
});
