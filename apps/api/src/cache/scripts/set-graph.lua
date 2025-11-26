-- KEYS:
-- 1: graph-update
-- 2..N: graph:<userId>
--
-- ARGV:
-- 1: lastSample
-- 2: JSON array of per-user fields arrays: [ [t1,s1,t2,s2,...], [ ... ], ... ]

-- Call a Redis command with large argument lists by chunking to avoid arg limits
-- The max number of arguments to a lua function is 7999. The cmd and key must be included with every redis call.
-- Because hashes are specified as a value after a key, the chunk size must also be even.
-- Therefore, the chunk size is set at 7996.
local function chunkCall(cmd, key, args)
  local size = 7996
  local len = #args
  local chunks = math.ceil(len / size)
  for i = 1, chunks do
    local start = (i - 1) * size + 1
    local stop = math.min(len, i * size)
    redis.call(cmd, key, unpack(args, start, stop))
  end
end

redis.call('SET', KEYS[1], ARGV[1])
local users = cjson.decode(ARGV[2])
for i = 1, #users do
  local key = KEYS[i + 1]
  local args = users[i]
  redis.call('DEL', key)
  if #args > 0 then
    chunkCall('HSET', key, args)
  end
end
