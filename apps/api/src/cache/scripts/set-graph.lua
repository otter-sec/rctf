-- KEYS:
-- 1: graph-update
-- 2: graph-data
--
-- ARGV:
-- 1: lastSample (timestamp)
-- 2..N: pairs of [userId, "t1,s1,t2,s2,..."] for each user with graph data

redis.call('SET', KEYS[1], ARGV[1])
redis.call('DEL', KEYS[2])

-- ARGV[2..] are userId, packedPoints pairs
local numPairs = (#ARGV - 1) / 2
if numPairs > 0 then
  local args = {}
  for i = 2, #ARGV, 2 do
    args[#args + 1] = ARGV[i]     -- userId
    args[#args + 1] = ARGV[i + 1] -- packed points
  end
  
  local size = 7996
  local len = #args
  if len > 0 then
    local chunks = math.ceil(len / size)
    for i = 1, chunks do
      local start = (i - 1) * size + 1
      local stop = math.min(len, i * size)
      redis.call('HSET', KEYS[2], unpack(args, start, stop))
    end
  end
end
