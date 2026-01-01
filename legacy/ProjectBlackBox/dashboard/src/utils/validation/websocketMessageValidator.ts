/**
 * WebSocket Message Validator
 * 
 * Utility for validating incoming and outgoing WebSocket messages.
 * Ensures messages conform to expected schemas and contain required fields.
 * Helps prevent security issues and improves error handling.
 */

import { z } from 'zod';

// Base message schema that all messages should follow
const baseMessageSchema = z.object({
  timestamp: z.number().optional(),
  id: z.string().uuid().optional(),
});

// Driver schema
const driverSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.nativeEnum({ active: 'active', inactive: 'inactive', pending: 'pending' }),
  role: z.nativeEnum({ driver: 'driver', navigator: 'navigator', observer: 'observer' }),
  telemetryEnabled: z.boolean().optional(),
});

// Team message schemas
const teamMessageOutgoingSchema = baseMessageSchema.extend({
  content: z.string().min(1).max(1000),
  senderId: z.string(),
  senderName: z.string(),
  priority: z.nativeEnum({ normal: 'normal', high: 'high', critical: 'critical' }),
});

const teamMessageIncomingSchema = baseMessageSchema.extend({
  message: z.object({
    content: z.string().min(1).max(1000),
    senderId: z.string(),
    senderName: z.string(),
    priority: z.nativeEnum({ normal: 'normal', high: 'high', critical: 'critical' }),
    timestamp: z.number(),
  }),
});

// Handoff schemas
const handoffRequestOutgoingSchema = baseMessageSchema.extend({
  fromId: z.string(),
  toId: z.string(),
  reason: z.string().max(500).optional(),
});

const handoffRequestIncomingSchema = baseMessageSchema.extend({
  handoff: z.object({
    id: z.string(),
    fromId: z.string(),
    fromName: z.string(),
    toId: z.string(),
    toName: z.string(),
    reason: z.string().max(500).optional(),
    timestamp: z.number(),
    status: z.nativeEnum({ pending: 'pending', confirmed: 'confirmed', rejected: 'rejected' }),
  }),
});

const handoffResponseOutgoingSchema = baseMessageSchema.extend({
  handoffId: z.string(),
  status: z.nativeEnum({ confirmed: 'confirmed', rejected: 'rejected' }),
});

const handoffResponseIncomingSchema = baseMessageSchema.extend({
  handoffId: z.string(),
  status: z.nativeEnum({ confirmed: 'confirmed', rejected: 'rejected' }),
});

// Driver comparison schemas
const driverComparisonOutgoingSchema = baseMessageSchema.extend({
  driverId1: z.string(),
  driverId2: z.string(),
});

const driverComparisonIncomingSchema = baseMessageSchema.extend({
  comparisonId: z.string(),
  metrics: z.array(
    z.object({
      name: z.string(),
      driverA: z.object({
        value: z.string(),
        delta: z.number(),
      }),
      driverB: z.object({
        value: z.string(),
        delta: z.number(),
      }),
    })
  ),
});

// Component validation schemas
const componentValidationOutgoingSchema = baseMessageSchema.extend({
  componentName: z.string(),
  props: z.object({}).passthrough(),
});

const componentValidationIncomingSchema = baseMessageSchema.extend({
  componentName: z.string(),
  validationResults: z.array(
    z.object({
      valid: z.boolean(),
      message: z.string().optional(),
      details: z.object({}).passthrough().optional(),
    })
  ),
});

// Driver switching schema
const driverSwitchOutgoingSchema = baseMessageSchema.extend({
  driverId: z.string(),
});

// Driver update/list schemas
const driverUpdateIncomingSchema = baseMessageSchema.extend({
  driver: driverSchema,
});

const driverListIncomingSchema = baseMessageSchema.extend({
  drivers: z.array(driverSchema),
});

// Map of event types to their validation schemas
const outgoingSchemas: Record<string, z.ZodType<any>> = {
  'team_message': teamMessageOutgoingSchema,
  'handoff_request': handoffRequestOutgoingSchema,
  'handoff_response': handoffResponseOutgoingSchema,
  'driver_comparison': driverComparisonOutgoingSchema,
  'component_validation': componentValidationOutgoingSchema,
  'switch_driver': driverSwitchOutgoingSchema,
};

const incomingSchemas: Record<string, z.ZodType<any>> = {
  'team_message': teamMessageIncomingSchema,
  'handoff_request': handoffRequestIncomingSchema,
  'handoff_response': handoffResponseIncomingSchema,
  'driver_comparison_result': driverComparisonIncomingSchema,
  'component_validation_result': componentValidationIncomingSchema,
  'driver_update': driverUpdateIncomingSchema,
  'driver_list': driverListIncomingSchema,
};

/**
 * Validate an outgoing message against its schema
 * @param eventType The type of event being sent
 * @param payload The message payload to validate
 * @returns A tuple containing [isValid, errors]
 */
export function validateOutgoingMessage(eventType: string, payload: any): [boolean, any] {
  const schema = outgoingSchemas[eventType];
  
  if (!schema) {
    console.warn(`No validation schema defined for outgoing event type: ${eventType}`);
    return [true, null]; // Allow unknown event types to pass through
  }
  
  try {
    schema.parse(payload);
    return [true, null];
  } catch (error) {
    console.error(`Validation error for outgoing ${eventType} message:`, error);
    return [false, error];
  }
}

/**
 * Validate an incoming message against its schema
 * @param eventType The type of event being received
 * @param payload The message payload to validate
 * @returns A tuple containing [isValid, errors]
 */
export function validateIncomingMessage(eventType: string, payload: any): [boolean, any] {
  const schema = incomingSchemas[eventType];
  
  if (!schema) {
    console.warn(`No validation schema defined for incoming event type: ${eventType}`);
    return [true, null]; // Allow unknown event types to pass through
  }
  
  try {
    schema.parse(payload);
    return [true, null];
  } catch (error) {
    console.error(`Validation error for incoming ${eventType} message:`, error);
    return [false, error];
  }
}

/**
 * Sanitize a message payload to prevent XSS and other injection attacks
 * @param payload The message payload to sanitize
 * @returns The sanitized payload
 */
export function sanitizeMessagePayload(payload: any): any {
  if (!payload) return payload;
  
  // For string values, sanitize to prevent XSS
  if (typeof payload === 'string') {
    return sanitizeString(payload);
  }
  
  // For arrays, sanitize each element
  if (Array.isArray(payload)) {
    return payload.map(item => sanitizeMessagePayload(item));
  }
  
  // For objects, sanitize each property
  if (typeof payload === 'object') {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(payload)) {
      sanitized[key] = sanitizeMessagePayload(value);
    }
    
    return sanitized;
  }
  
  // For other types (number, boolean, null, undefined), return as is
  return payload;
}

/**
 * Sanitize a string to prevent XSS
 * @param str The string to sanitize
 * @returns The sanitized string
 */
function sanitizeString(str: string): string {
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\\/g, '&#092;')
    .replace(/\//g, '&#047;');
}

export default {
  validateOutgoingMessage,
  validateIncomingMessage,
  sanitizeMessagePayload,
};
