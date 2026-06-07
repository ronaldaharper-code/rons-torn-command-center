# TORN_API_FIELD_MAP

| Module | API endpoint / selection | Field name | Confirmed | Notes |
|---|---|---|---|---|
| Public summary | `/user/?selections=basic,profile,stats,travel,networth,inventory` | `basic.name`, `basic.level`, `basic.rank` | Partial | Basic profile fields are standard.
| Public summary | `/user/?selections=basic,profile,stats,travel,networth,inventory` | `travel.status`, `travel.jail`, `travel.hospital` | Partial | Status may require additional selection values in Torn docs.
| Public summary | `/user/?selections=basic,profile,stats,travel,networth,inventory` | `networth.total`, `networth.cash` | Partial | Net worth fields are typically available.
| Admin summary | `/user/?selections=basic,profile,stats,travel,networth,inventory,items,properties` | `profile.energy`, `profile.nerve`, `profile.happy`, `profile.life` | Partial | These values are likely inside `profile` or top-level response.
| Admin summary | `/user/?selections=basic,profile,stats,travel,networth,inventory,items` | `profile.drug_cooldown`, `profile.booster_cooldown`, `profile.medical_cooldown` | Partial | Cooldown naming may differ by Torn API version.
| Consumables summary | `/user/?selections=inventory,items` | `inventory.items`, `items.*.quantity` | Partial | Inventory mapping is used for consumables counts.
| Settings | Local DB / Prisma | `ItemWatch` | N/A | Local watchlist is stored in SQLite for development.

> Notes: This map is built from the Torn API wrapper used by the app. Confirm exact fields against Torn developer docs and update the selections if additional Torn API fields are needed.
