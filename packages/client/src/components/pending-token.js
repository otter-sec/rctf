import { Fragment } from 'preact'
import { useEffect, useState, useCallback } from 'preact/hooks'
import { setAuthToken } from '../api/auth'
import { pendingPrivateProfile } from '../api/profile'

const PendingToken = ({ authToken, perms }) => {
  const [user, setUser] = useState(null)
  useEffect(() => {
    ;(async () => {
      if (!authToken) {
        return
      }
      const user = await pendingPrivateProfile({ authToken })
      setUser(user)
    })()
  }, [authToken])
  const handleLoginClick = useCallback(() => {
    setAuthToken({ authToken, perms })
  }, [authToken, perms])
  if (!user) {
    return null
  }
  return (
    <Fragment>
      <div className='row u-center'>
        <h3>Login as {user.name}?</h3>
      </div>
      <div className='row u-center'>
        <button className='btn-info' onClick={handleLoginClick}>
          Login
        </button>
      </div>
    </Fragment>
  )
}

export default PendingToken
