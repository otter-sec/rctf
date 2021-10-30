import withStyles from './jss'

export default withStyles(
  {
    root: {
      padding: '25px',
    },
    submit: {
      marginTop: '25px',
    },
    icon: {
      '& svg': {
        verticalAlign: 'middle',
        height: '16px',
        fill: '#333',
      },
    },
  },
  props => {
    const { classes, children, onSubmit, disabled, buttonText, errors } = props

    return (
      <form onSubmit={onSubmit} className={props.class}>
        {[].concat(children).map(input => {
          if (input.props === undefined) {
            return undefined
          }
          if (!input.props.name) {
            return input
          }
          let { icon, error, name } = input.props

          if (errors !== undefined && name !== undefined)
            error = error || errors[name]
          const hasError = error !== undefined

          input.props.class += ' input-contains-icon'
          if (hasError) {
            input.props.class += ' input-error'
          }
          return (
            <div className='form-section' key={name}>
              {hasError && (
                <label className='text-danger info font-light'>{error}</label>
              )}
              <div className={`${classes.input} input-control`}>
                {input}
                <span className='icon'>
                  {icon !== undefined && (
                    <div className={`icon ${classes.icon}`}>{icon}</div>
                  )}
                </span>
              </div>
            </div>
          )
        })}
        <button
          disabled={disabled}
          className={`${classes.submit} btn-info u-center`}
          name='btn'
          value='submit'
          type='submit'
        >
          {buttonText}
        </button>
        <span className='fg-danger info' />
      </form>
    )
  }
)
