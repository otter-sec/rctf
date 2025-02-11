import { Fragment } from 'preact'
import { useCallback } from 'preact/hooks'
import { Link } from 'react-router-dom'
import Modal from './modal'
import Pagination from './pagination'
import withStyles from './jss'
import { formatRelativeTime } from '../util/time'
import Clock from '../icons/clock.svg'

const SolvesDialog = withStyles(
  {
    button: {
      fontFamily: 'inherit',
    },
    table: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, max-content)',
      '& div': {
        margin: 'auto',
        padding: '5px 10px',
        textAlign: 'center',
        whiteSpace: 'nowrap',
      },
    },
    label: {
      borderBottom: '1px solid #fff',
      width: '100%',
      textAlign: 'center',
    },
    name: {
      overflow: 'hidden',
      width: '300px',
    },
    inlineLabel: {
      display: 'none',
    },
    icon: {
      width: '60px',
      margin: 'auto',
    },
    empty: {
      '& h5': {
        color: '#fff !important',
      },
      padding: '0 3rem',
      paddingTop: '3rem',
    },
    modalBody: {
      maxHeight: '60vh !important',
    },
    '@media (max-width: 768px)': {
      inlineLabel: {
        display: 'initial',
        borderRight: '1px solid #fff',
      },
      table: {
        gridTemplateColumns: 'repeat(2, minmax(max-content, 1fr))',
        '& div': {
          margin: '0',
        },
      },
      label: {
        display: 'none',
      },
      number: {
        borderTop: '1px solid #fff',
      },
      name: {
        width: 'initial',
        maxWidth: '300px',
      },
    },
  },
  ({
    onClose,
    classes,
    challName,
    solveCount,
    solves,
    page,
    setPage,
    pageSize,
    modalBodyRef,
    ...props
  }) => {
    const wrappedOnClose = useCallback(
      e => {
        e.preventDefault()
        onClose()
      },
      [onClose]
    )

    return (
      <Modal {...props} open={solves !== null} onClose={onClose}>
        {solves !== null && (
          <Fragment>
            {solves.length === 0 ? (
              <div className={classes.empty}>
                <div className={classes.icon}>
                  <Clock />
                </div>
                <h5>{challName} has no solves.</h5>
              </div>
            ) : (
              <Fragment>
                <div className='modal-header'>
                  <div className='modal-title'>Solves for {challName}</div>
                </div>
                <div
                  className={`modal-body ${classes.modalBody}`}
                  ref={modalBodyRef}
                >
                  <div className={classes.table}>
                    <div className={classes.label}>#</div>
                    <div className={classes.label}>Team</div>
                    <div className={classes.label}>Solve time</div>
                    {solves.map((solve, i) => (
                      <Fragment key={solve.userId}>
                        <div
                          className={`${classes.inlineLabel} ${classes.number}`}
                        >
                          #
                        </div>
                        <div className={classes.number}>
                          {(page - 1) * pageSize + i + 1}
                        </div>
                        <div className={classes.inlineLabel}>Team</div>
                        <div className={classes.name}>
                          <Link to={`/profile/${solve.userId}`}>
                            {solve.userName}
                          </Link>
                        </div>
                        <div className={classes.inlineLabel}>Solve time</div>
                        <div>{formatRelativeTime(solve.createdAt)}</div>
                      </Fragment>
                    ))}
                  </div>
                  <Pagination
                    {...{ totalItems: solveCount, pageSize, page, setPage }}
                    numVisiblePages={9}
                  />
                </div>
              </Fragment>
            )}
            <div className='modal-footer'>
              <div className='btn-container u-inline-block'>
                <button
                  className={`btn-small outline ${classes.button}`}
                  onClick={wrappedOnClose}
                >
                  Close
                </button>
              </div>
            </div>
          </Fragment>
        )}
      </Modal>
    )
  }
)

export default SolvesDialog
