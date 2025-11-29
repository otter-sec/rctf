-- KEYS[1]: rate limit key
--
-- ARGV[1]: limit (max requests)
-- ARGV[2]: ttl in milliseconds

local key = KEYS[1]
local limit = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])

local count = redis.call('INCR', key)

if count == 1 then
  redis.call('PEXPIRE', key, ttl)
end

if count > limit then
  return redis.call('PTTL', key)
else
  return -1
end

