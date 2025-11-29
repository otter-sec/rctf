-- KEYS:
-- 1: graph-update
-- 2..N: graph:<userId>
--
-- ARGV:
-- [1]: lastSample (timestamp)
-- [2]: numUsers
-- [3..]: For each user: [numPoints, t1, s1, t2, s2, ...] where numPoints is count of t,s pairs

-- Call a Redis command with large argument lists by chunking to avoid arg limits
local function chunkHset(key, args)
  local size = 7996
  local len = #args
  if len == 0 then return end
  local chunks = math.ceil(len / size)
  for i = 1, chunks do
    local start = (i - 1) * size + 1
    local stop = math.min(len, i * size)
    redis.call('HSET', key, unpack(args, start, stop))
  end
end

-- Parse ARGV
local lastSample = ARGV[1]
local numUsers = tonumber(ARGV[2])

redis.call('SET', KEYS[1], lastSample)

local idx = 3
for i = 1, numUsers do
  local key = KEYS[i + 1]
  local numElements = tonumber(ARGV[idx])
  idx = idx + 1
  
  redis.call('DEL', key)
  
  if numElements > 0 then
    -- Collect the hash field-value pairs for this user
    local args = {}
    for j = 1, numElements do
      args[j] = ARGV[idx]
      idx = idx + 1
    end
    chunkHset(key, args)
  end
end
