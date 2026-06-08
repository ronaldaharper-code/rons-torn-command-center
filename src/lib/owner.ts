// This app currently serves a single Torn player. Persisted records are
// scoped by this key so that a future multi-player version can assign each
// player their own ownerKey without changing the Prisma schema shape.
export const DEFAULT_OWNER_KEY = "ron";
