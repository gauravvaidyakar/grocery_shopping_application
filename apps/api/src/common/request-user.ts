import type { Role } from "@prisma/client";

export interface RequestUser {
  id: string;
  role: Role;
  email?: string;
  mobile?: string;
}
