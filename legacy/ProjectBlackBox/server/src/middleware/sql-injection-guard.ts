/**
 * SQL Injection Protection Middleware and Utilities
 * Ensures all database queries use parameterized statements
 */

import { Request, Response, NextFunction } from 'express';
import { Pool, PoolClient, QueryConfig, QueryResult, QueryResultRow } from 'pg';

/**
 * Safe query wrapper that enforces parameterized queries
 * Prevents accidental SQL injection by making it harder to use string concatenation
 */
export class SafeDB {
  constructor(private pool: Pool) {}

  /**
   * Execute a safe parameterized query
   *
   * @param text SQL query with $1, $2, etc. placeholders
   * @param params Array of parameter values
   * @returns Query result
   *
   * @example
   * // GOOD ✅
   * await safeDB.query('SELECT * FROM users WHERE email = $1', [userEmail]);
   *
   * // BAD ❌ (won't compile with TypeScript strict mode)
   * await safeDB.query(`SELECT * FROM users WHERE email = '${userEmail}'`);
   */
  async query<T extends QueryResultRow = any>(text: string, params: any[] = []): Promise<QueryResult<T>> {
    // Validate that query uses parameterized format
    if (params.length > 0 && !text.includes('$')) {
      throw new Error('SQL Injection Prevention: Query has parameters but no placeholders. Use $1, $2, etc.');
    }

    // Warn if query looks like it might have string interpolation
    if (text.includes('${') || (text.includes("'") && text.includes('+'))) {
      console.error('⚠️  WARNING: Query may contain string interpolation. This is a potential SQL injection risk!');
      console.error('Query:', text.substring(0, 100));
    }

    return this.pool.query(text, params);
  }

  /**
   * Execute query with QueryConfig object
   */
  async queryConfig<T extends QueryResultRow = any>(config: QueryConfig): Promise<QueryResult<T>> {
    if (!config.values || config.values.length === 0) {
      if (config.text.includes('$')) {
        throw new Error('Query has placeholders but no values provided');
      }
    }
    return this.pool.query<T>(config);
  }

  /**
   * Transaction wrapper
   */
  async withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

/**
 * Input validation middleware
 * Sanitizes common SQL injection attack patterns in request parameters
 */
export const sanitizeInputs = (req: Request, res: Response, next: NextFunction): void => {
  const dangerousPatterns = [
    /(\bOR\b.*=.*)|(\bAND\b.*=.*)/i,           // OR/AND injection
    /UNION\s+SELECT/i,                          // UNION injection
    /;.*DROP\s+TABLE/i,                         // DROP TABLE
    /;.*DELETE\s+FROM/i,                        // DELETE injection
    /--/,                                        // SQL comments
    /\/\*/,                                      // Block comments
    /xp_cmdshell/i,                             // Command execution
    /exec\s*\(/i,                               // Stored procedure execution
  ];

  const checkValue = (value: any, path: string): void => {
    if (typeof value === 'string') {
      for (const pattern of dangerousPatterns) {
        if (pattern.test(value)) {
          console.warn(`⚠️  Potential SQL injection attempt blocked at ${path}: ${value.substring(0, 50)}`);
          throw new Error('Invalid input: Potential SQL injection detected');
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      Object.entries(value).forEach(([key, val]) => {
        checkValue(val, `${path}.${key}`);
      });
    }
  };

  try {
    // Check query parameters
    if (req.query) {
      checkValue(req.query, 'query');
    }

    // Check body parameters
    if (req.body) {
      checkValue(req.body, 'body');
    }

    // Check route parameters
    if (req.params) {
      checkValue(req.params, 'params');
    }

    next();
  } catch (error) {
    res.status(400).json({
      error: 'Invalid input',
      message: error instanceof Error ? error.message : 'Bad request'
    });
  }
};

/**
 * Query builder helper for safe dynamic queries
 */
export class QueryBuilder {
  private conditions: string[] = [];
  private values: any[] = [];
  private paramCount = 0;

  /**
   * Add a WHERE condition with safe parameterization
   */
  where(column: string, operator: string, value: any): this {
    this.paramCount++;
    this.conditions.push(`${this.escapeIdentifier(column)} ${operator} $${this.paramCount}`);
    this.values.push(value);
    return this;
  }

  /**
   * Add an AND condition
   */
  and(column: string, operator: string, value: any): this {
    return this.where(column, operator, value);
  }

  /**
   * Add an OR condition
   */
  or(column: string, operator: string, value: any): this {
    this.paramCount++;
    const condition = `${this.escapeIdentifier(column)} ${operator} $${this.paramCount}`;

    if (this.conditions.length > 0) {
      const last = this.conditions[this.conditions.length - 1];
      this.conditions[this.conditions.length - 1] = `(${last} OR ${condition})`;
    } else {
      this.conditions.push(condition);
    }

    this.values.push(value);
    return this;
  }

  /**
   * Build the WHERE clause
   */
  build(): { whereClause: string; values: any[] } {
    const whereClause = this.conditions.length > 0
      ? `WHERE ${this.conditions.join(' AND ')}`
      : '';

    return {
      whereClause,
      values: this.values
    };
  }

  /**
   * Escape identifier (table/column name) to prevent injection
   */
  private escapeIdentifier(identifier: string): string {
    // Remove any non-alphanumeric characters except underscore
    const sanitized = identifier.replace(/[^a-zA-Z0-9_]/g, '');

    if (sanitized !== identifier) {
      throw new Error(`Invalid identifier: ${identifier}`);
    }

    return `"${sanitized}"`;
  }
}

/**
 * Common query patterns with built-in SQL injection protection
 */
export const SafeQueries = {
  /**
   * Safe SELECT query
   */
  select: (table: string, columns: string[], whereClause?: { column: string; value: any }[]) => {
    const escapedTable = table.replace(/[^a-zA-Z0-9_]/g, '');
    const escapedColumns = columns.map(c => c.replace(/[^a-zA-Z0-9_]/g, ''));

    let query = `SELECT ${escapedColumns.join(', ')} FROM "${escapedTable}"`;
    const values: any[] = [];

    if (whereClause && whereClause.length > 0) {
      const conditions = whereClause.map((w, i) => {
        values.push(w.value);
        return `"${w.column.replace(/[^a-zA-Z0-9_]/g, '')}" = $${i + 1}`;
      });
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    return { query, values };
  },

  /**
   * Safe INSERT query
   */
  insert: (table: string, data: Record<string, any>) => {
    const escapedTable = table.replace(/[^a-zA-Z0-9_]/g, '');
    const columns = Object.keys(data).map(c => c.replace(/[^a-zA-Z0-9_]/g, ''));
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const query = `INSERT INTO "${escapedTable}" (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;

    return { query, values };
  },

  /**
   * Safe UPDATE query
   */
  update: (table: string, data: Record<string, any>, whereClause: { column: string; value: any }[]) => {
    const escapedTable = table.replace(/[^a-zA-Z0-9_]/g, '');
    const columns = Object.keys(data);
    const values = Object.values(data);

    const sets = columns.map((col, i) => {
      const escapedCol = col.replace(/[^a-zA-Z0-9_]/g, '');
      return `"${escapedCol}" = $${i + 1}`;
    });

    let paramCount = values.length;
    const conditions = whereClause.map(w => {
      paramCount++;
      values.push(w.value);
      const escapedCol = w.column.replace(/[^a-zA-Z0-9_]/g, '');
      return `"${escapedCol}" = $${paramCount}`;
    });

    const query = `UPDATE "${escapedTable}" SET ${sets.join(', ')} WHERE ${conditions.join(' AND ')} RETURNING *`;

    return { query, values };
  }
};

export default {
  SafeDB,
  sanitizeInputs,
  QueryBuilder,
  SafeQueries
};
