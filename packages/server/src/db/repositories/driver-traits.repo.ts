/**
 * Driver Traits Repository
 * CRUD operations for derived driver trait labels
 */

import { pool } from '../client.js';
import { DriverTrait } from '../../driverbox/types/idp.types.js';

// ========================
// Trait CRUD
// ========================

export interface CreateDriverTraitDTO {
    driver_profile_id: string;
    trait_key: string;
    trait_label: string;
    trait_category: string;
    confidence: number;
    evidence_summary: string;
}

export async function upsertDriverTrait(dto: CreateDriverTraitDTO): Promise<DriverTrait> {
    // First, expire any existing trait with this key
    await pool.query(
        `UPDATE driver_traits 
     SET valid_until = NOW() 
     WHERE driver_profile_id = $1 
       AND trait_key = $2 
       AND valid_until IS NULL`,
        [dto.driver_profile_id, dto.trait_key]
    );

    // Insert new trait
    const result = await pool.query<DriverTrait>(
        `INSERT INTO driver_traits (
      driver_profile_id,
      trait_key,
      trait_label,
      trait_category,
      confidence,
      evidence_summary
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`,
        [
            dto.driver_profile_id,
            dto.trait_key,
            dto.trait_label,
            dto.trait_category,
            dto.confidence,
            dto.evidence_summary,
        ]
    );
    return result.rows[0];
}

export async function getCurrentTraits(driverProfileId: string): Promise<DriverTrait[]> {
    const result = await pool.query<DriverTrait>(
        `SELECT * FROM driver_traits 
     WHERE driver_profile_id = $1 AND valid_until IS NULL
     ORDER BY confidence DESC`,
        [driverProfileId]
    );
    return result.rows;
}

export async function getTraitsByCategory(
    driverProfileId: string,
    category: string
): Promise<DriverTrait[]> {
    const result = await pool.query<DriverTrait>(
        `SELECT * FROM driver_traits 
     WHERE driver_profile_id = $1 
       AND trait_category = $2 
       AND valid_until IS NULL
     ORDER BY confidence DESC`,
        [driverProfileId, category]
    );
    return result.rows;
}

export async function getTraitHistory(
    driverProfileId: string,
    traitKey: string
): Promise<DriverTrait[]> {
    const result = await pool.query<DriverTrait>(
        `SELECT * FROM driver_traits 
     WHERE driver_profile_id = $1 AND trait_key = $2
     ORDER BY computed_at DESC`,
        [driverProfileId, traitKey]
    );
    return result.rows;
}

export async function expireTrait(traitId: string): Promise<void> {
    await pool.query(
        'UPDATE driver_traits SET valid_until = NOW() WHERE id = $1',
        [traitId]
    );
}

export async function expireAllTraits(driverProfileId: string): Promise<void> {
    await pool.query(
        'UPDATE driver_traits SET valid_until = NOW() WHERE driver_profile_id = $1 AND valid_until IS NULL',
        [driverProfileId]
    );
}
