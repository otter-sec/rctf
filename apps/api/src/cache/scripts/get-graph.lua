local cjson = cjson

-- KEYS:
-- 1: leaderboard key (global or division)
-- 2: leaderboard-update key
-- 3: graph-data key
--
-- ARGV:
-- 1: maxTeams
-- 2: offset

local maxUsers = tonumber(ARGV[1])
local offset = tonumber(ARGV[2]) or 0
local startIdx = offset * 3
local endIdx = startIdx + maxUsers * 3 - 1
local latest = redis.call('LRANGE', KEYS[1], startIdx, endIdx)

local userIds = {}
for i = 1, #latest, 3 do
  userIds[#userIds + 1] = latest[i]
end

local graphData = {}
if #userIds > 0 then
  graphData = redis.call('HMGET', KEYS[3], unpack(userIds))
end

local lastUpdate = redis.call('GET', KEYS[2])
return cjson.encode({ lastUpdate, latest, graphData })
