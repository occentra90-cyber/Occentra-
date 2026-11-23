# Occentra GIF Studio

Creates short branded GIFs for social and invitations.

## Routes
- `/gifs` — studio UI

## Storage
- Supabase table from migration `20261123_gif_studio.sql`
- See `lib/gifstore.ts`

## Rendering
- Scene builder: `lib/gifscene.ts`
- Core GIF helpers: `lib/gif.ts`, `lib/gifbg.ts`
