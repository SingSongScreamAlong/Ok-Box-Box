import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

function loginRedirectPlugin() {
    return {
        name: 'okboxbox-login-redirect',
        configureServer(server: any) {
            server.middlewares.use((req: any, res: any, next: any) => {
                if (req.url === '/login') {
                    const location = 'https://app.okboxbox.com/login';

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
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 5174, // Distinct from dashboard (5173) and legacy (3000/3005)
    },
});
