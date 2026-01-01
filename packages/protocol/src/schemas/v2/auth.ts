/**
 * Protocol v2 Auth & Entitlements Schemas
 */

import { z } from 'zod';

// ============================================================================
// ROLES & PRODUCTS
// ============================================================================

export const UserRoleSchema = z.enum([
    'DRIVER',
    'TEAM',
    'RACE_CONTROL',
    'ADMIN'
]);

export type UserRole = z.infer<typeof UserRoleSchema>;

export const ProductTierSchema = z.enum([
    'FREE',
    'PRO',
    'TEAM'
]);

export type ProductTier = z.infer<typeof ProductTierSchema>;

export const PreferredModeSchema = z.enum([
    'DRIVER',
    'RACE_CONTROL',
    'BOTH'
]);

export type PreferredMode = z.infer<typeof PreferredModeSchema>;

// ============================================================================
// ENTITLEMENTS
// ============================================================================

export const BlackBoxEntitlementSchema = z.object({
    enabled: z.boolean(),
    tier: ProductTierSchema.optional(),
});

export const ControlBoxEntitlementSchema = z.object({
    enabled: z.boolean(),
});

export const EntitlementsSchema = z.object({
    userId: z.string(),
    orgId: z.string().optional(),
    roles: z.array(UserRoleSchema),
    products: z.object({
        blackbox: BlackBoxEntitlementSchema,
        controlbox: ControlBoxEntitlementSchema,
    }),
    defaults: z.object({
        preferredMode: PreferredModeSchema,
    }),
});

export type Entitlements = z.infer<typeof EntitlementsSchema>;

// ============================================================================
// AUTH RESPONSES
// ============================================================================

export const LoginResponseSchema = z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresIn: z.number(),          // seconds
    user: z.object({
        id: z.string(),
        email: z.string().email(),
        name: z.string(),
    }),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const MeResponseSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
    orgId: z.string().optional(),
    orgName: z.string().optional(),
    roles: z.array(UserRoleSchema),
});

export type MeResponse = z.infer<typeof MeResponseSchema>;
