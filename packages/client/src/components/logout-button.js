import { Fragment } from 'preact'
import { useState, useCallback } from 'preact/hooks'
import Modal from './modal'
import { logout } from '../api/auth'
import withStyles from './jss'

const LogoutDialog = withStyles(
  {
    button: {
      fontFamily: 'inherit',
    },
  },
  ({ onClose, classes, ...props }) => {
    const wrappedOnClose = useCallback(
      e => {
        e.preventDefault()
        onClose()
      },
      [onClose]
    )
    const doLogout = useCallback(
      e => {
        e.preventDefault()
        logout()
        onClose()
      },
      [onClose]
    )

    return (
      <Modal {...props} onClose={onClose}>
        <div className='modal-header'>
          <div className='modal-title'>Logout</div>
        </div>
        <div className='modal-body'>
          <div>This will log you out on your current device.</div>
        </div>
        <div className='modal-footer'>
          <div className='btn-container u-inline-block'>
            <button
              className={`btn-small outline ${classes.button}`}
              onClick={wrappedOnClose}
            >
              Cancel
            </button>
          </div>
          <div className='btn-container u-inline-block'>
            <button
              className={`btn-small btn-danger outline ${classes.button}`}
              onClick={doLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </Modal>
    )
  }
)

function LogoutButton({ ...props }) {
  const [isDialogVisible, setIsDialogVisible] = useState(false)
  const onClick = useCallback(e => {
    e.preventDefault()
    setIsDialogVisible(true)
  }, [])
  const onClose = useCallback(() => setIsDialogVisible(false), [])

  return (
    <Fragment>
      <a {...props} href='#' onClick={onClick}>
        Logout
      </a>
      <LogoutDialog open={isDialogVisible} onClose={onClose} />
    </Fragment>
  )
}

export default LogoutButton
