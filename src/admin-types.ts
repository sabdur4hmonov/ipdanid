export type StaffRole =
  "catalog" | "support" | "fulfillment" | "finance" | "codes" | "manager";
export type AdminPermission =
  | "catalog"
  | "support"
  | "orders"
  | "fulfill"
  | "finance"
  | "codes"
  | "audit"
  | "messages"
  | "access";
export type AdminSession = {
  id: string;
  name: string;
  role: StaffRole | "owner";
  permissions: AdminPermission[];
  expiresAt: number | null;
};
export type StaffAccess = {
  id: string;
  name: string;
  role: StaffRole;
  expiresAt: number;
  revoked: boolean;
  createdAt: string;
};
export const STAFF_ROLES: StaffRole[] = [
  "catalog",
  "support",
  "fulfillment",
  "finance",
  "codes",
  "manager",
];
