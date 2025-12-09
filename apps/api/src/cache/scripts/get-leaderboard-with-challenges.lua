-- KEYS:
-- 1: leaderboard key
-- 2: challenge-info key
--
-- ARGV:
-- 1: start
-- 2: end
-- 3: includeRange ("1" | "0")

local includeRange = ARGV[3] == "1"
local leaderboard = {}

if includeRange then
  leaderboard = redis.call('LRANGE', KEYS[1], ARGV[1], ARGV[2])
end

local total = redis.call('LLEN', KEYS[1])
local challengeInfo = redis.call('HGETALL', KEYS[2])

return { leaderboard, total, challengeInfo }
