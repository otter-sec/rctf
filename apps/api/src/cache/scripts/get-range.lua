--- KEYS[1]: leaderboard key
--
--- ARGV[1]: start
--- ARGV[2]: end

local result = redis.call('LRANGE', KEYS[1], ARGV[1], ARGV[2])
result[#result + 1] = redis.call('LLEN', KEYS[1])
return result
