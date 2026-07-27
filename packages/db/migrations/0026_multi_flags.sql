UPDATE "challenges"
SET "data" = jsonb_set(
  "data" - 'flag',
  '{flags}',
  CASE
    WHEN COALESCE("data" ->> 'flag', '') = '' THEN '[]'::jsonb
    ELSE jsonb_build_array(jsonb_build_object(
      'provider', 'flags/static',
      'config', jsonb_build_object('flag', "data" -> 'flag')
    ))
  END,
  true
)
WHERE NOT ("data" ? 'flags');--> statement-breakpoint
UPDATE "challenges"
SET "data" = "data" - 'flag'
WHERE ("data" ? 'flags') AND ("data" ? 'flag');
