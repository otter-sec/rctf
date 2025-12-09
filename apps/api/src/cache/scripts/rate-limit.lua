-- KEYS:
-- 1: rate limit key
--
-- ARGV:
-- 1: burst
-- 2: window (ms)

local key = KEYS[1]
local burst = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local rate = window / burst

local now = redis.call('TIME')
local now_ms = tonumber(now[1]) * 1000 + math.floor(tonumber(now[2]) / 1000)

local data = redis.call('HMGET', key, 't', 's')
local tokens = tonumber(data[1]) or burst
local ts = tonumber(data[2]) or now_ms

local refill = math.floor((now_ms - ts) / rate)
tokens = math.min(burst, tokens + refill)
ts = ts + refill * rate

if tokens < 1 then
  return math.ceil(rate - (now_ms - ts))
end

redis.call('HMSET', key, 't', tokens - 1, 's', ts)
redis.call('PEXPIRE', key, window)
return -1
