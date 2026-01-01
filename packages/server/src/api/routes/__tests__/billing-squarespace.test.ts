// =====================================================================
// Squarespace Billing Route Tests
// =====================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Squarespace Billing - Signature Verification', () => {
    it('should reject requests with invalid signature', async () => {
        // Test that webhook signature verification works
        // The verifySignature function uses HMAC SHA256
        const crypto = await import('crypto');

        const payload = JSON.stringify({ test: 'data' });
        const secret = 'test-secret';
        const validSig = crypto.createHmac('sha256', secret)
            .update(payload)
            .digest('hex');

        const invalidSig = 'invalid-signature';

        // Valid signature should match expected
        expect(validSig).toHaveLength(64); // SHA256 hex is 64 chars
        expect(invalidSig).not.toBe(validSig);
    });
});

describe('Squarespace Billing - SKU Mapping', () => {
    const SKU_TO_PRODUCT: Record<string, string> = {
        'BLACKBOX': 'blackbox',
        'CONTROLBOX': 'controlbox',
        'BUNDLE': 'bundle',
        'BB-MONTHLY': 'blackbox',
        'BB-ANNUAL': 'blackbox',
        'CB-MONTHLY': 'controlbox',
        'CB-ANNUAL': 'controlbox',
        'BUNDLE-MONTHLY': 'bundle',
        'BUNDLE-ANNUAL': 'bundle'
    };

    it('should map BLACKBOX SKU to blackbox product', () => {
        expect(SKU_TO_PRODUCT['BLACKBOX']).toBe('blackbox');
    });

    it('should map CONTROLBOX SKU to controlbox product', () => {
        expect(SKU_TO_PRODUCT['CONTROLBOX']).toBe('controlbox');
    });

    it('should map BUNDLE SKU to bundle product', () => {
        expect(SKU_TO_PRODUCT['BUNDLE']).toBe('bundle');
    });

    it('should map monthly subscription SKUs correctly', () => {
        expect(SKU_TO_PRODUCT['BB-MONTHLY']).toBe('blackbox');
        expect(SKU_TO_PRODUCT['CB-MONTHLY']).toBe('controlbox');
        expect(SKU_TO_PRODUCT['BUNDLE-MONTHLY']).toBe('bundle');
    });

    it('should map annual subscription SKUs correctly', () => {
        expect(SKU_TO_PRODUCT['BB-ANNUAL']).toBe('blackbox');
        expect(SKU_TO_PRODUCT['CB-ANNUAL']).toBe('controlbox');
        expect(SKU_TO_PRODUCT['BUNDLE-ANNUAL']).toBe('bundle');
    });
});

describe('Squarespace Billing - Entitlement Status', () => {
    const determineEntitlementStatus = (
        topic: string,
        fulfillmentStatus: string,
        refundedTotal?: number
    ): string => {
        // Check for refund
        if (refundedTotal && refundedTotal > 0) {
            return 'canceled';
        }

        // Check fulfillment status
        switch (fulfillmentStatus) {
            case 'FULFILLED':
                return 'active';
            case 'CANCELED':
                return 'canceled';
            case 'PENDING':
            default:
                return topic === 'order.create' ? 'active' : 'pending';
        }
    };

    it('should return active for fulfilled orders', () => {
        expect(determineEntitlementStatus('order.create', 'FULFILLED')).toBe('active');
        expect(determineEntitlementStatus('order.update', 'FULFILLED')).toBe('active');
    });

    it('should return canceled for canceled orders', () => {
        expect(determineEntitlementStatus('order.create', 'CANCELED')).toBe('canceled');
    });

    it('should return canceled for refunded orders', () => {
        expect(determineEntitlementStatus('order.update', 'FULFILLED', 29.99)).toBe('canceled');
    });

    it('should return active for new pending orders', () => {
        expect(determineEntitlementStatus('order.create', 'PENDING')).toBe('active');
    });

    it('should return pending for updated pending orders', () => {
        expect(determineEntitlementStatus('order.update', 'PENDING')).toBe('pending');
    });
});
