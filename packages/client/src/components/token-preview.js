import withStyles from './jss'

export default withStyles(
  {
    quote: {
      fontSize: 'small',
      overflowWrap: 'break-word',
      userSelect: 'all',
      fontFamily: 'monospace !important',
      cursor: 'pointer',
      background: '#111',
    },
  },
  ({ classes, token, ...props }) => {
    return (
      <blockquote className={classes.quote} {...props}>
        {token}
      </blockquote>
    )
  }
)
