export type UserRole = "usuario" | "moderador" | "admin";

export function normalizeRole(value: unknown): UserRole {
  return value === "admin" || value === "moderador" ? value : "usuario";
}

export function isAdministrator(value: unknown): boolean {
  return value === "admin";
}

export const administrationScreens = [
  "admin",
  "admin-publicar",
  "admin-publicacoes",
  "admin-lugar",
  "admin-equipe",
] as const;

export function isAdministrationPath(path: string): boolean {
  return administrationScreens.some((screen) => path === `/${screen}`);
}
