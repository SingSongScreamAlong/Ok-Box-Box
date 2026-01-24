export function Login() {
    const appLoginUrl = 'https://app.okboxbox.com/login';

    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
            <h1 className="text-2xl font-bold mb-4">Redirecting to App...</h1>
            <p className="text-[--muted] mb-8">Taking you to the canonical application UI.</p>

            <a href={appLoginUrl} className="btn btn-primary">
                Click here if not redirected
            </a>

            <meta httpEquiv="refresh" content={`1;url=${appLoginUrl}`} />
        </div>
    );
}
