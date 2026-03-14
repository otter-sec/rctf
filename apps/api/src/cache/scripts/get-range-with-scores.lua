-- KEYS:
-- 1: leaderboard key
-- 2: score-positions key
--
-- ARGV:
-- 1: start
-- 2: end
-- 3: keys per user

local range = redis.call('LRANGE', KEYS[1], ARGV[1], ARGV[2])
local total = redis.call('LLEN', KEYS[1])
local keysPerUser = tonumber(ARGV[3])

local ids = {}
for i = 1, #range, keysPerUser do
  ids[#ids + 1] = range[i]
end

local scores = {}
if #ids > 0 then
  scores = redis.call('HMGET', KEYS[2], unpack(ids))
end

return {range, total, scores}
