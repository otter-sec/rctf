import { config } from '@rctf/config'
import type { ServerConfig } from '@rctf/types'

type ACLCheck = (email: string | undefined) => boolean

interface CompiledACL {
  check: ACLCheck
  divisions: (keyof ServerConfig['divisions'])[]
}

const restrictionChecks: {
  [checkType: string]: (value: string) => ACLCheck
} = {
  domain: value => email => email?.endsWith('@' + value) ?? false,
  email: value => email => email === value,
  regex: value => {
    const re = new RegExp(value)
    return email => (email === undefined ? false : re.test(email))
  },
  any: value => email => true,
}

const compileACLs = (): CompiledACL[] => {
  let divisionACLs = config.divisionACLs

  // allow everything if no ACLs or if no email verify
  if (!divisionACLs || divisionACLs.length === 0 || !config.email) {
    divisionACLs = [
      {
        match: 'any',
        value: '',
        divisions: Object.keys(config.divisions),
      },
    ]
  }

  return divisionACLs.map(({ match, value, divisions }) => {
    const checkItem = restrictionChecks[match]
    if (!checkItem) {
      throw new Error(`Unsupported ACL check: ${match}`)
    }
    return { check: checkItem(value), divisions }
  })
}

export const compiledACLs = compileACLs()

export const allowedDivisions = (email: string | undefined): string[] => {
  for (const acl of compiledACLs) {
    if (acl.check(email)) {
      return acl.divisions
    }
  }
  return []
}

export const divisionAllowed = (
  email: string | undefined,
  division: string
): boolean => {
  return allowedDivisions(email).includes(division)
}
