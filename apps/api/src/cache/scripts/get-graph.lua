local cjson = cjson

-- KEYS:
-- 1: leaderboard key (global or division)
-- 2: leaderboard-update key
--
-- ARGV:
-- 1: maxTeams

local maxUsers = tonumber(ARGV[1])
local latest = redis.call('LRANGE', KEYS[1], 0, maxUsers * 3 - 1)
local users = {}

for i = 1, #latest, 3 do
  local id = latest[i]
  users[#users + 1] = redis.call('HGETALL', 'graph:' .. id)
end

local lastUpdate = redis.call('GET', KEYS[2])
return cjson.encode({ lastUpdate, latest, users })
