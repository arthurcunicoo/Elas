// Events currently belong to the configured service, not to a map viewport.
// Callers with a city-specific record can pass ServiceArea.timezone explicitly.
export const serviceTimeZone = process.env.EXPO_PUBLIC_SERVICE_TIMEZONE || "America/Sao_Paulo";
