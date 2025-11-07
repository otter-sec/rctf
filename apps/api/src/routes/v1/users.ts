import {
  CreateMemberRoute,
  DeleteCtftimeRoute,
  DeleteEmailRoute,
  DeleteMemberRoute,
  GetMembersRoute,
  GetUserRoute,
  GetUserSelfRoute,
  SetCtftimeRoute,
  SetEmailRoute,
  UpdateUserRoute,
} from '@rctf/types'
import { createRouterGroup } from '../../lib/route-module'

const group = createRouterGroup()
export default group

const exampleSolves = [
  {
    category: 'misc',
    name: 'Warmup',
    points: 100,
    solves: 42,
    id: 'chal-1',
    createdAt: 1_700_000_000,
  },
]

const exampleUserData = {
  name: 'es3n1n',
  ctftimeId: '12345',
  division: 'open',
  score: 4_200,
  globalPlace: 1,
  divisionPlace: 1,
  solves: exampleSolves,
  perms: 1,
}

const exampleMember = {
  id: 'member-1',
  userid: 'user-1',
  email: 'teammate@example.com',
}

group.declareRouter(GetUserSelfRoute, async ({ ctx, user, res }) => {
  return res.goodUserSelfData({
    id: user.id,
    name: user.name,
    email: user.email ?? undefined,
    ctftimeId: user.ctftimeId ?? undefined,
    division: user.division,
    score: 4_200,
    globalPlace: 1,
    divisionPlace: 1,
    solves: exampleSolves,
    teamToken: 'team-token',
    allowedDivisions: ['open', 'student'],
    perms: 1,
  })
})

group.declareRouter(GetUserRoute, async ({ res }) => {
  return res.goodUserData(exampleUserData)
})

group.declareRouter(UpdateUserRoute, async ({ user, res }) => {
  return res.goodUserUpdate({
    user: {
      name: user.name,
      email: user.email ?? undefined,
      division: user.division,
    },
  })
})

group.declareRouter(GetMembersRoute, async ({ res }) => {
  return res.goodMemberData([exampleMember])
})

group.declareRouter(CreateMemberRoute, async ({ res }) => {
  return res.goodMemberCreate(exampleMember)
})

group.declareRouter(DeleteMemberRoute, async ({ res }) => {
  return res.goodMemberDelete()
})

group.declareRouter(SetEmailRoute, async ({ res }) => {
  return res.goodEmailSet()
})

group.declareRouter(DeleteEmailRoute, async ({ res }) => {
  return res.goodEmailRemoved()
})

group.declareRouter(SetCtftimeRoute, async ({ res }) => {
  return res.goodCtftimeAuthSet()
})

group.declareRouter(DeleteCtftimeRoute, async ({ res }) => {
  return res.goodCtftimeRemoved()
})
