/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ICreateAuditLogPayload {
  userId?: string;
  userEmail?: string;
  action: string;
  entity: string;
  entityId?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
}