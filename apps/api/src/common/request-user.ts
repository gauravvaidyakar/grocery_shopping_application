import type { Role } from "../database/domain.types";

export interface RequestUser {
  id: string;
  role: Role;
  email?: string;
  mobile?: string;
}
