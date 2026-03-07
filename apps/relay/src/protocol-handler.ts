import { app } from 'electron';

export function registerProtocol(): boolean {
    return app.setAsDefaultProtocolClient('okboxbox');
}

export function parseProtocolUrl(url: string): { action: string; token: string } | null {
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'okboxbox:') {
            return null;
        }
        const action = parsed.hostname || parsed.pathname.replace(/^\//, '');
        const token = parsed.searchParams.get('token');
        if (!action || !token) {
            return null;
        }
        return { action, token };
    } catch {
        return null;
    }
}

export function extractProtocolUrl(argv: string[]): string | null {
    return argv.find((arg) => arg.startsWith('okboxbox://')) || null;
}
