import dotenv from 'dotenv'

dotenv.config({ path: '.env.test' })

const testConfig = {
  baseUrl: process.env.BASE_URL || 'http://localhost:8080',
  ctfName: process.env.NAME,
  homeContent: process.env.HOME_CONTENT,
  loginToken: process.env.LOGIN_TOKEN,
  divisions: process.env.DIVISIONS ? JSON.parse(process.env.DIVISIONS) : {},

  testChal: process.env.TEST_CHAL,
  testChalAns: process.env.TEST_CHAL_ANSWER || '',

  testRegEmail: process.env.TEST_REG_EMAIL || '',
  testRegName: process.env.TEST_REG_NAME || '',

  testUpdateEmail: process.env.TEST_UPDATE_EMAIL || '',
  testUpdateName: process.env.TEST_UPDATE_NAME || '',

  testNewEmail: process.env.TEST_NEW_MEMBER || '',

  testNewChalName: process.env.TEST_NEW_CHAL_NAME || '',
  testNewChalAuthor: process.env.TEST_NEW_CHAL_AUTHOR || '',
  testNewChalDes: process.env.TEST_NEW_CHAL_DES || '',
  testNewChalFlag: process.env.TEST_NEW_CHAL_FLAG || '',

  regularUserToken: process.env.REGULAR_USER_TOKEN || '',
}

export default testConfig
