import { useToast, Toast as ToastType } from '../../contexts/ToastContext';
import './Toast.css';

// =====================================================================
// Icons
// =====================================================================

const icons: Record<ToastType['type'], string> = {
    success: '✓',
    error: '✕',
    warning: '!',
    info: 'i',
};

// =====================================================================
// Single Toast Component
// =====================================================================

interface ToastItemProps {
    toast: ToastType;
    onClose: () => void;
}

function ToastItem({ toast, onClose }: ToastItemProps) {
    return (
        <div className={`toast ${toast.type}`}>
            <div className="toast-icon">{icons[toast.type]}</div>
            <span className="toast-message">{toast.message}</span>
            <button className="toast-close" onClick={onClose} aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                </svg>
            </button>
            {toast.duration && toast.duration > 0 && (
                <div className="toast-progress">
                    <div
                        className="toast-progress-bar"
                        style={{ animationDuration: `${toast.duration}ms` }}
                    />
                </div>
            )}
        </div>
    );
}

// =====================================================================
// Toast Container Component
// =====================================================================

export function ToastContainer() {
    const { toasts, removeToast } = useToast();

    if (toasts.length === 0) {
        return null;
    }

    return (
        <div className="toast-container">
            {toasts.map(toast => (
                <ToastItem
                    key={toast.id}
                    toast={toast}
                    onClose={() => removeToast(toast.id)}
                />
            ))}
        </div>
    );
}
