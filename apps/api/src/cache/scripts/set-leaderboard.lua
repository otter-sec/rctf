-- KEYS:
-- 1: score-positions
-- 2: challenge-info
-- 3: global-leaderboard
-- 4: leaderboard-update
-- 5: first-bloods
--
-- ARGV:
-- [1]: leaderboardUpdate (number as string)
-- [2]: numDivisions
-- [3..3+numDivisions-1]: division names
-- [3+numDivisions..3+numDivisions*2-1]: division leaderboard key names
-- [next]: numLeaderboardElements (numUsers * 4)
-- [next..]: leaderboard elements [id, name, division, score, ...] repeated
-- [after leaderboard]: numChallengeElements (numChallenges * 2)
-- [after..]: challenge info elements [id, json payload, ...] repeated
-- [after challenges]: numFirstBloodsElements (numChallenges * 2)
-- [after..]: first bloods elements [challengeId, "userId1,userId2,...", ...] repeated

-- Call a Redis command with large argument lists by chunking to avoid arg limits
local function chunkCall(cmd, key, args)
  local size = 7996
  local len = #args
  if len == 0 then return end
  local chunks = math.ceil(len / size)
  for i = 1, chunks do
    local start = (i - 1) * size + 1
    local stop = math.min(len, i * size)
    redis.call(cmd, key, unpack(args, start, stop))
  end
end

-- Parse ARGV
local idx = 1
local leaderboardUpdate = ARGV[idx]
idx = idx + 1

local numDivisions = tonumber(ARGV[idx])
idx = idx + 1

local divisions = {}
for i = 1, numDivisions do
  divisions[i] = ARGV[idx]
  idx = idx + 1
end

local divisionKeys = {}
for i = 1, numDivisions do
  divisionKeys[i] = ARGV[idx]
  idx = idx + 1
end

local numLeaderboardElements = tonumber(ARGV[idx])
idx = idx + 1

-- Read leaderboard data directly from ARGV
local leaderboardStart = idx
idx = idx + numLeaderboardElements

local numChallengeElements = tonumber(ARGV[idx])
idx = idx + 1

local challengeInfoStart = idx
idx = idx + numChallengeElements

local numFirstBloodsElements = tonumber(ARGV[idx])
idx = idx + 1

local firstBloodsStart = idx

-- Build division boards and score positions
local divisionBoards = {}
local divisionCounters = {}
for i = 1, numDivisions do
  divisionBoards[divisions[i]] = {}
  divisionCounters[divisions[i]] = 0
end

local globalBoard = {}
local scorePositionsArgs = {}

local numUsers = numLeaderboardElements / 4
for i = 1, numUsers do
  local base = leaderboardStart + (i - 1) * 4
  local id = ARGV[base]
  local name = ARGV[base + 1]
  local division = ARGV[base + 2]
  local score = ARGV[base + 3]

  local divBoard = divisionBoards[division]
  local divisionPlace = 0
  if divBoard ~= nil then
    divisionCounters[division] = divisionCounters[division] + 1
    divBoard[#divBoard + 1] = id
    divBoard[#divBoard + 1] = name
    divBoard[#divBoard + 1] = score
    divisionPlace = divisionCounters[division]
    scorePositionsArgs[#scorePositionsArgs + 1] = id
    scorePositionsArgs[#scorePositionsArgs + 1] = score .. ',' .. tostring(i) .. ',' .. tostring(divisionPlace)
  else
    scorePositionsArgs[#scorePositionsArgs + 1] = id
    scorePositionsArgs[#scorePositionsArgs + 1] = score .. ',' .. tostring(i) .. ',0'
  end

  globalBoard[#globalBoard + 1] = id
  globalBoard[#globalBoard + 1] = name
  globalBoard[#globalBoard + 1] = score
  globalBoard[#globalBoard + 1] = division
  globalBoard[#globalBoard + 1] = tostring(divisionPlace)
end

-- Build challenge info array from ARGV
local challengeInfoArgs = {}
for i = 1, numChallengeElements do
  challengeInfoArgs[i] = ARGV[challengeInfoStart + i - 1]
end

-- Build first bloods array from ARGV
local firstBloodsArgs = {}
for i = 1, numFirstBloodsElements do
  firstBloodsArgs[i] = ARGV[firstBloodsStart + i - 1]
end

local allKeys = {}
for i = 1, 5 do
  allKeys[i] = KEYS[i]
end
for i = 1, numDivisions do
  allKeys[5 + i] = divisionKeys[i]
end

-- Clear existing keys
redis.call('DEL', unpack(allKeys))

-- Write challenge-info hash
if #challengeInfoArgs > 0 then
  chunkCall('HSET', KEYS[2], challengeInfoArgs)
end

-- Write global leaderboard list
if #globalBoard > 0 then
  chunkCall('RPUSH', KEYS[3], globalBoard)
end

-- Write division leaderboard lists
for d = 1, numDivisions do
  local div = divisions[d]
  local key = divisionKeys[d]
  local board = divisionBoards[div]
  if board and #board > 0 then
    chunkCall('RPUSH', key, board)
  end
end

-- Write score positions hash
if #scorePositionsArgs > 0 then
  chunkCall('HSET', KEYS[1], scorePositionsArgs)
end

-- Write first bloods hash
if #firstBloodsArgs > 0 then
  chunkCall('HSET', KEYS[5], firstBloodsArgs)
end

-- Write leaderboard update time
redis.call('SET', KEYS[4], leaderboardUpdate)
