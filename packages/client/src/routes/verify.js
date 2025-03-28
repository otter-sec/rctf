import { useEffect, useState } from 'preact/hooks'
import Error from './error'
import config from '../config'
import { verify } from '../api/auth'
import PendingToken from '../components/pending-token'

const Verify = () => {
  const [authToken, setAuthToken] = useState(null)
  const [emailSet, setEmailSet] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    document.title = `Verify | ${config.ctfName}`
  }, [])

  const handleVerifyClick = async () => {
    const qs = new URLSearchParams(location.search)
    if (qs.has('token')) {
      const verifyRes = await verify({ verifyToken: qs.get('token') })
      if (verifyRes.authToken) {
        setAuthToken(verifyRes.authToken)
      } else if (verifyRes.emailSet) {
        setEmailSet(true)
      } else {
        setError(verifyRes.verifyToken)
      }
    } else {
      setError("No verification token provided.")
    }
  }

  if (error) {
    return <Error error='401' message={error} />
  }
  if (emailSet) {
    return (
      <div className='row u-center'>
        <h3>The email change has been verified. You can now close this tab.</h3>
      </div>
    )
  }
  if (authToken == null) {
    return (
      <Fragment>
        <div class='row u-center'>
          <h3>Verify email?</h3>
        </div>
        <div class='row u-center'>
          <button class='btn-info' onClick={handleVerifyClick}>Verify</button>
        </div>
      </Fragment>
    )
  }
  return <PendingToken authToken={authToken} />
}

export default Verify
