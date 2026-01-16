/**
 * Driver Reports Repository
 * CRUD operations for AI-generated driver reports
 */

import { pool } from '../client.js';
import { DriverReport, ReportType, ReportStatus } from '../../driverbox/types/idp.types.js';

// ========================
// Report CRUD
// ========================

export interface CreateDriverReportDTO {
    driver_profile_id: string;
    report_type: ReportType;
    session_id?: string;
    title: string;
    content_json: Record<string, unknown>;
    content_html?: string;
    content_markdown?: string;
    ai_model?: string;
    ai_prompt_version?: string;
    generation_context?: Record<string, unknown>;
    status?: ReportStatus;
}

export async function createDriverReport(dto: CreateDriverReportDTO): Promise<DriverReport> {
    const result = await pool.query<DriverReport>(
        `INSERT INTO driver_reports (
      driver_profile_id,
      report_type,
      session_id,
      title,
      content_json,
      content_html,
      content_markdown,
      ai_model,
      ai_prompt_version,
      generation_context,
      status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
        [
            dto.driver_profile_id,
            dto.report_type,
            dto.session_id || null,
            dto.title,
            JSON.stringify(dto.content_json),
            dto.content_html || null,
            dto.content_markdown || null,
            dto.ai_model || null,
            dto.ai_prompt_version || null,
            dto.generation_context ? JSON.stringify(dto.generation_context) : null,
            dto.status || 'draft',
        ]
    );
    return result.rows[0];
}

export async function getReportById(reportId: string): Promise<DriverReport | null> {
    const result = await pool.query<DriverReport>(
        'SELECT * FROM driver_reports WHERE id = $1',
        [reportId]
    );
    return result.rows[0] || null;
}

export async function getReportsForDriver(
    driverProfileId: string,
    options?: {
        reportType?: ReportType;
        status?: ReportStatus;
        limit?: number;
        offset?: number;
    }
): Promise<DriverReport[]> {
    let query = 'SELECT * FROM driver_reports WHERE driver_profile_id = $1';
    const params: unknown[] = [driverProfileId];
    let paramCount = 2;

    if (options?.reportType) {
        query += ` AND report_type = $${paramCount++}`;
        params.push(options.reportType);
    }
    if (options?.status) {
        query += ` AND status = $${paramCount++}`;
        params.push(options.status);
    }

    query += ' ORDER BY created_at DESC';

    if (options?.limit) {
        query += ` LIMIT $${paramCount++}`;
        params.push(options.limit);
    }
    if (options?.offset) {
        query += ` OFFSET $${paramCount++}`;
        params.push(options.offset);
    }

    const result = await pool.query<DriverReport>(query, params);
    return result.rows;
}

export async function getReportForSession(
    sessionId: string,
    driverProfileId: string
): Promise<DriverReport | null> {
    const result = await pool.query<DriverReport>(
        `SELECT * FROM driver_reports 
     WHERE session_id = $1 AND driver_profile_id = $2 AND report_type = 'session_debrief'
     ORDER BY created_at DESC LIMIT 1`,
        [sessionId, driverProfileId]
    );
    return result.rows[0] || null;
}

export async function updateReportStatus(
    reportId: string,
    status: ReportStatus
): Promise<DriverReport | null> {
    const result = await pool.query<DriverReport>(
        `UPDATE driver_reports 
     SET status = $2, 
         published_at = CASE WHEN $2 = 'published' THEN NOW() ELSE published_at END,
         updated_at = NOW()
     WHERE id = $1 RETURNING *`,
        [reportId, status]
    );
    return result.rows[0] || null;
}

export async function countReportsForDriver(
    driverProfileId: string,
    reportType?: ReportType
): Promise<number> {
    const params: unknown[] = [driverProfileId];
    let query = 'SELECT COUNT(*) as count FROM driver_reports WHERE driver_profile_id = $1';

    if (reportType) {
        query += ' AND report_type = $2';
        params.push(reportType);
    }

    const result = await pool.query<{ count: string }>(query, params);
    return parseInt(result.rows[0].count, 10);
}
