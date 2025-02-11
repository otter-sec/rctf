import withStyles from '../jss'
import { getMembers, addMember, removeMember } from '../../api/members'
import { useState, useCallback, useEffect } from 'preact/hooks'
import Form from '../form'
import EnvelopeOpen from '../../icons/envelope-open.svg'
import { useToast } from '../toast'

const MemberRow = withStyles(
  {
    root: {
      alignItems: 'center',
      width: '100%',
      display: 'flex',
      justifyContent: 'space-between',
    },
  },
  ({ classes, id, email, setMembers }) => {
    const { toast } = useToast()

    const handleDelete = useCallback(() => {
      removeMember({ id }).then(() => {
        setMembers(members => members.filter(a => a.id !== id))

        toast({ body: 'Team member successfully deleted' })
      })
    }, [id, setMembers, toast])

    return (
      <div className={classes.root} key={id}>
        <p className='u-no-margin'>{email}</p>
        <div className='btn-container u-vertical-center'>
          <input
            onClick={handleDelete}
            type='submit'
            className='btn-small btn-danger u-no-margin'
            value='Delete'
          />
        </div>
      </div>
    )
  }
)

const MembersCard = withStyles(
  {
    form: {
      '& button': {
        display: 'block',
        marginLeft: 'auto',
        marginRight: '0',
        marginTop: '10px',
      },
    },
  },
  ({ classes }) => {
    const { toast } = useToast()

    const [email, setEmail] = useState('')
    const handleEmailChange = useCallback(e => setEmail(e.target.value), [])

    const [buttonDisabled, setButtonDisabled] = useState(false)

    const [members, setMembers] = useState([])

    const handleSubmit = useCallback(
      e => {
        e.preventDefault()
        setButtonDisabled(true)

        addMember({ email }).then(({ error, data }) => {
          setButtonDisabled(false)

          if (error) {
            toast({ body: error, type: 'error' })
          } else {
            toast({ body: 'Team member successfully added' })
            setMembers(members => [...members, data])
            setEmail('')
          }
        })
      },
      [email, toast]
    )

    useEffect(() => {
      getMembers().then(data => setMembers(data))
    }, [])

    return (
      <div className='card'>
        <div className='content'>
          <p>Team Information</p>
          <p className='font-thin u-no-margin'>
            Please enter a separate email for each team member. This data is
            collected for informational purposes only. Ensure that this section
            is up to date in order to remain prize eligible.
          </p>
          <div className='row u-center'>
            <Form
              class={`col-12 ${classes.form}`}
              onSubmit={handleSubmit}
              disabled={buttonDisabled}
              buttonText='Add Member'
            >
              <input
                required
                autoComplete='email'
                autoCorrect='off'
                icon={<EnvelopeOpen />}
                name='email'
                placeholder='Email'
                type='email'
                value={email}
                onChange={handleEmailChange}
              />
            </Form>
            {members.length !== 0 && (
              <div className='row'>
                {members.map(data => (
                  <MemberRow key={data.id} setMembers={setMembers} {...data} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }
)

export default MembersCard
