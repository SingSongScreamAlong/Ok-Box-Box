/**
 * Billing Service
 * Handles Stripe interactions for subscription management.
 */

import { useAuthStore } from '../stores/auth.store';

// Set your API URL (using Vite env var)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface CheckoutSessionResponse {
    id: string;
    url: string;
}

export interface PortalSessionResponse {
    url: string;
}

// Helper to get headers with detailed error logging
function getHeaders() {
    const token = useAuthStore.getState().accessToken;
    if (!token) {
        console.error('BillingService: No access token found in AuthStore');
    }
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

export const billingService = {
    /**
     * Start a Stripe Checkout session for a subscription
     * @param priceId The Stripe Price ID for the subscription
     */
    async startCheckout(priceId: string): Promise<void> {
        try {
            const response = await fetch(`${API_URL}/api/billing/stripe/checkout`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    priceId,
                    successUrl: `${window.location.origin}/billing/return?success=true`,
                    cancelUrl: `${window.location.origin}/my-idp?canceled=true` // Return to IDP page on cancel
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Checkout failed: ${response.status} ${errorText}`);
            }

            const session: CheckoutSessionResponse = await response.json();

            // Redirect to Stripe hosted checkout
            window.location.href = session.url;
        } catch (error) {
            console.error('BillingService Error:', error);
            throw error;
        }
    },

    /**
     * Open the Stripe Customer Portal for managing existing subscriptions
     */
    async openCustomerPortal(): Promise<void> {
        try {
            const response = await fetch(`${API_URL}/api/billing/stripe/portal`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    returnUrl: `${window.location.origin}/my-idp` // Return to IDP page after managing
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Portal access failed: ${response.status} ${errorText}`);
            }

            const session: PortalSessionResponse = await response.json();

            // Redirect to Stripe portal
            window.location.href = session.url;
        } catch (error) {
            console.error('BillingService Error:', error);
            throw error;
        }
    }
};
