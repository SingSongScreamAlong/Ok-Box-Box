import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'BlackBox - Team Dashboard',
    description: 'AI Race Engineering Platform',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                <div style={{
                    backgroundColor: '#ff0000',
                    color: 'white',
                    textAlign: 'center',
                    padding: '10px',
                    fontWeight: 'bold',
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 99999,
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                }}>
                    LEGACY — REFERENCE ONLY — DO NOT BUILD HERE
                </div>
                <div style={{ paddingTop: '44px' }}>
                    {children}
                </div>
            </body>
        </html>
    );
}
