import { createModules } from '../../lib/route-module'

import authGroup from './auth'
import challsGroup from './challs'

export default [...createModules(authGroup), ...createModules(challsGroup)]
