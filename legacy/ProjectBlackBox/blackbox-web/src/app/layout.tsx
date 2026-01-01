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
            <body>{children}</body>
        </html>
    );
}
