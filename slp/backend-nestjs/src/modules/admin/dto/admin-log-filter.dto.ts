export class AdminLogFilterDto {
  search?: string;          // free‑text search (username, action, targetType, targetId, details)
  action?: string;          // exact match
  targetType?: string;      // exact match
  from?: Date;
  to?: Date;
  adminId?: number;         // kept for future use
  count?: number;           // max number of logs to return, default 100
}