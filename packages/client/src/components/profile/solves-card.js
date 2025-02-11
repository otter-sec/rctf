import { Fragment } from 'preact'
import withStyles from '../jss'
import { formatRelativeTime } from '../../util/time'
import Clock from '../../icons/clock.svg'

const makeSolvesCard = isPrivate =>
  withStyles(
    {
      root: {
        display: 'grid',
        padding: '20px',
        paddingTop: '0',
        gridTemplateColumns: 'repeat(4, minmax(max-content, 1fr))',
        '& div': {
          margin: 'auto',
          padding: '10px',
        },
      },
      title: {
        gridColumn: '1 / -1',
        margin: '20px auto !important',
      },
      label: {
        borderBottom: '1px solid #fff',
        width: '100%',
        textAlign: 'center',
      },
      inlineLabel: {
        display: 'none',
      },
      icon: {
        width: '60px',
        margin: 'auto !important',
      },
      [`@media (max-width: ${isPrivate ? '1500px' : '800px'})`]: {
        inlineLabel: {
          display: 'initial',
          borderRight: '1px solid #fff',
        },
        root: {
          gridTemplateColumns: 'repeat(2, minmax(max-content, 1fr))',
          '& div': {
            margin: '0',
          },
        },
        label: {
          display: 'none',
        },
        category: {
          borderTop: '1px solid #fff',
        },
      },
    },
    ({ classes, solves }) => {
      return (
        <div className={`card ${classes.root}`}>
          {solves.length === 0 ? (
            <div className={classes.title}>
              <div className={classes.icon}>
                <Clock />
              </div>
              <h5>This team has no solves.</h5>
            </div>
          ) : (
            <Fragment>
              <h5 className={`title ${classes.title}`}>Solves</h5>
              <div className={classes.label}>Category</div>
              <div className={classes.label}>Challenge</div>
              <div className={classes.label}>Solve time</div>
              <div className={classes.label}>Points</div>
              {solves.map(solve => (
                <Fragment key={solve.id}>
                  <div className={`${classes.inlineLabel} ${classes.category}`}>
                    Category
                  </div>
                  <div className={classes.category}>{solve.category}</div>
                  <div className={classes.inlineLabel}>Name</div>
                  <div>{solve.name}</div>
                  <div className={classes.inlineLabel}>Solve time</div>
                  <div>{formatRelativeTime(solve.createdAt)}</div>
                  <div className={classes.inlineLabel}>Points</div>
                  <div>{solve.points}</div>
                </Fragment>
              ))}
            </Fragment>
          )}
        </div>
      )
    }
  )

export const PublicSolvesCard = makeSolvesCard(false)
export const PrivateSolvesCard = makeSolvesCard(true)
