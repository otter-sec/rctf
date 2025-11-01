import dotenv from 'dotenv'

dotenv.config({ path: '.env.test' })

const getVariable = (key: string): string => {
  const value = process.env[key]

  if (value === undefined) {
    throw new Error(`Missing environment variable: ${key}`)
  }

  return value
}

export interface TestConfig {
  baseUrl: string
  ctfName: string
  homeContent: string
  loginToken: string
  divisions: Record<string, string>
  testChal: string
  testChalAns: string
  testRegEmail: string
  testRegName: string
  testUpdateEmail: string
  testUpdateName: string
  testNewEmail: string
  testNewChalName: string
  testNewChalAuthor: string
  testNewChalDes: string
  testNewChalFlag: string
  regularUserToken: string
}

const testConfig: TestConfig = {
  baseUrl: getVariable('BASE_URL'),
  ctfName: getVariable('NAME'),
  homeContent: getVariable('HOME_CONTENT'),
  loginToken: getVariable('LOGIN_TOKEN'),
  divisions: JSON.parse(getVariable('DIVISIONS')) as Record<string, string>,

  testChal: getVariable('TEST_CHAL'),
  testChalAns: getVariable('TEST_CHAL_ANSWER'),

  testRegEmail: getVariable('TEST_REG_EMAIL'),
  testRegName: getVariable('TEST_REG_NAME'),

  testUpdateEmail: getVariable('TEST_UPDATE_EMAIL'),
  testUpdateName: getVariable('TEST_UPDATE_NAME'),

  testNewEmail: getVariable('TEST_NEW_MEMBER'),

  testNewChalName: getVariable('TEST_NEW_CHAL_NAME'),
  testNewChalAuthor: getVariable('TEST_NEW_CHAL_AUTHOR'),
  testNewChalDes: getVariable('TEST_NEW_CHAL_DES'),
  testNewChalFlag: getVariable('TEST_NEW_CHAL_FLAG'),

  regularUserToken: getVariable('REGULAR_USER_TOKEN'),
}

export default testConfig
