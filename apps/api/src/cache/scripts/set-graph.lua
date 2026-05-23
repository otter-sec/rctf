-- KEYS:
-- 1: graph-update
-- 2: graph-data
-- 3: graph-fingerprint (incremental mode only)
-- 4: graph-cursor (incremental mode only)
-- 5: graph-source (incremental mode only)
--
-- ARGV:
-- snapshot mode, KEYS[1..2]:
--   1: lastSample (timestamp)
--   2..N: pairs of [userId, "t1,s1,t2,s2,..."] for each user with graph data
-- incremental mode, KEYS[1..5]:
--   1: lastSample (timestamp)
--   2: fingerprint
--   3: cursor
--   4: source
--   5..N: pairs of [userId, "t1,s1,t2,s2,..."] for users changed by the delta

local function hsetPairs(dataKey, startIndex)
  local args = {}
  for i = startIndex, #ARGV, 2 do
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
      redis.call('HSET', dataKey, unpack(args, start, stop))
    end
  end
end

if #KEYS == 5 then
  hsetPairs(KEYS[2], 5)
  redis.call('SET', KEYS[1], ARGV[1])
  redis.call('SET', KEYS[3], ARGV[2])
  redis.call('SET', KEYS[4], ARGV[3])
  redis.call('SET', KEYS[5], ARGV[4])
  return
end

redis.call('SET', KEYS[1], ARGV[1])
redis.call('DEL', KEYS[2])
hsetPairs(KEYS[2], 2)
