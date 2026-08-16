import type { Role } from "./types";

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  ENTREPRENEUR: [
    "business:own",
    "ai:chat",
    "market:read",
    "finance:own",
    "documents:own",
  ],
  CHAMBER_OPERATOR: ["business:own", "ai:chat", "market:read", "chamber:ops"],
  ANALYST: ["market:read", "analytics:aggregated", "ai:chat"],
  ADMIN: [
    "admin:all",
    "users:read",
    "ai:costs",
    "system:health",
    "business:own",
    "ai:chat",
    "market:read",
  ],
  GOVERNMENT_ANALYST: ["analytics:aggregated", "risk:signals", "market:read"],
};

export function can(role: Role, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role] ?? [];
  return perms.includes("admin:all") || perms.includes(permission);
}

export function assertSameTenant(actorBusinessId: string | null, targetBusinessId: string): boolean {
  return !!actorBusinessId && actorBusinessId === targetBusinessId;
}
