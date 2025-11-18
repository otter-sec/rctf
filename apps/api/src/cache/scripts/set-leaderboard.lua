local cjson = cjson

-- KEYS:
-- 1: score-positions
-- 2: challenge-info
-- 3: global-leaderboard
-- 4: leaderboard-update
-- 5..N: division-leaderboard:<division>
--
-- ARGV:
-- 1: JSON wireLeaderboard [id, name, division, score, ...]
-- 2: JSON divisions [division, ...]
-- 3: JSON wireChallengeInfos [id, "score,solves", id, "score,solves", ...]
-- 4: leaderboardUpdate (number)

local wireLeaderboard = cjson.decode(ARGV[1])
local divisions = cjson.decode(ARGV[2])
local wireChallengeInfos = cjson.decode(ARGV[3])
local leaderboardUpdate = ARGV[4]

local scorePositionsArgs = {}

-- build per-division lists
local divisionBoards = {}
for i = 1, #divisions do
  divisionBoards[divisions[i]] = {}
end

local globalBoard = {}
local divisionCounters = {}
for i = 1, #divisions do
  divisionCounters[divisions[i]] = 0
end

local numUsers = #wireLeaderboard / 4
for i = 1, numUsers do
  local base = (i - 1) * 4
  local id = wireLeaderboard[base + 1]
  local name = wireLeaderboard[base + 2]
  local division = wireLeaderboard[base + 3]
  local score = wireLeaderboard[base + 4]

  -- push to global board (triples)
  globalBoard[#globalBoard + 1] = id
  globalBoard[#globalBoard + 1] = name
  globalBoard[#globalBoard + 1] = score

  -- division board
  local divBoard = divisionBoards[division]
  if divBoard ~= nil then
    divisionCounters[division] = divisionCounters[division] + 1
    divBoard[#divBoard + 1] = id
    divBoard[#divBoard + 1] = name
    divBoard[#divBoard + 1] = score
    local divisionPlace = divisionCounters[division]
    scorePositionsArgs[#scorePositionsArgs + 1] = id
    scorePositionsArgs[#scorePositionsArgs + 1] = tostring(score) .. ',' .. tostring(i) .. ',' .. tostring(divisionPlace)
  else
    -- unknown division; store with division place 0
    scorePositionsArgs[#scorePositionsArgs + 1] = id
    scorePositionsArgs[#scorePositionsArgs + 1] = tostring(score) .. ',' .. tostring(i) .. ',0'
  end
end

-- clear existing lists and hashes
redis.call('DEL', unpack(KEYS))

-- write challenge-info
if #wireChallengeInfos > 0 then
  redis.call('HSET', KEYS[2], unpack(wireChallengeInfos))
end

-- write global list
if #globalBoard > 0 then
  redis.call('RPUSH', KEYS[3], unpack(globalBoard))
end

-- write division lists
for d = 1, #divisions do
  local div = divisions[d]
  local key = KEYS[4 + d] -- after leaderboard-update
  local board = divisionBoards[div]
  if board and #board > 0 then
    redis.call('RPUSH', key, unpack(board))
  end
end

-- write positions
if #scorePositionsArgs > 0 then
  redis.call('HSET', KEYS[1], unpack(scorePositionsArgs))
end

-- write leaderboard update time
redis.call('SET', KEYS[4], leaderboardUpdate)
