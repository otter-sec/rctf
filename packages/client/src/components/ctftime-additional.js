import Form from '../components/form'
import useRecaptcha from '../components/recaptcha'
import config from '../config'
import withStyles from '../components/jss'
import { register } from '../api/auth'
import UserCircle from '../icons/user-circle.svg'
import { useEffect, useState, useCallback } from 'preact/hooks'

export default withStyles(
  {
    root: {
      padding: '1.5em',
      '& input': {
        background: '#222',
        color: '#fff !important',
      },
    },
    submit: {
      marginTop: '1.5em',
    },
    title: {
      textAlign: 'center',
    },
  },
  ({ classes, ctftimeToken, ctftimeName }) => {
    const [disabledButton, setDisabledButton] = useState(false)
    const division = config.defaultDivision || Object.keys(config.divisions)[0]
    const [showName, setShowName] = useState(false)

    const [name, setName] = useState(ctftimeName)
    const handleNameChange = useCallback(e => setName(e.target.value), [])

    const [errors, setErrors] = useState({})
    const requestRecaptchaCode = useRecaptcha('register')

    const handleRegister = useCallback(async () => {
      setDisabledButton(true)

      const { errors } = await register({
        ctftimeToken,
        name: name || undefined,
        division,
        recaptchaCode: await requestRecaptchaCode?.(),
      })
      setDisabledButton(false)

      if (!errors) {
        return
      }
      if (errors.name) {
        setShowName(true)
      }

      setErrors(errors)
    }, [ctftimeToken, name, division, requestRecaptchaCode])

    const handleSubmit = useCallback(
      e => {
        e.preventDefault()

        handleRegister()
      },
      [handleRegister]
    )

    // Try login with CTFtime token only, if fails prompt for name
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(handleRegister, [])

    return (
      <div className='row u-center'>
        <Form
          class={`${classes.root} col-6`}
          onSubmit={handleSubmit}
          disabled={disabledButton}
          errors={errors}
          buttonText='Register'
        >
          {showName && (
            <input
              autoFocus
              required
              autoComplete='username'
              autoCorrect='off'
              icon={<UserCircle />}
              name='name'
              maxLength='64'
              minLength='2'
              placeholder='Team Name'
              type='text'
              value={name}
              onChange={handleNameChange}
            />
          )}
        </Form>
      </div>
    )
  }
)
