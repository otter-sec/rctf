import withStyles from '../components/jss'
import { useState, useCallback, useRef } from 'preact/hooks'

import { submitFlag, getSolves } from '../api/challenges'
import { useToast } from './toast'
import SolvesDialog from './solves-dialog'
import Markdown from './markdown'

const ExternalLink = props => <a {...props} target='_blank' />

const markdownComponents = {
  A: ExternalLink,
}

const solvesPageSize = 10

const Problem = ({ classes, problem, solved, setSolved }) => {
  const { toast } = useToast()

  const hasDownloads = problem.files.length !== 0

  const [error, setError] = useState(undefined)
  const hasError = error !== undefined

  const [value, setValue] = useState('')
  const handleInputChange = useCallback(e => setValue(e.target.value), [])

  const handleSubmit = useCallback(
    e => {
      e.preventDefault()

      submitFlag(problem.id, value.trim()).then(({ error }) => {
        if (error === undefined) {
          toast({ body: 'Flag successfully submitted!' })

          setSolved(problem.id)
        } else {
          toast({ body: error, type: 'error' })
          setError(error)
        }
      })
    },
    [toast, setSolved, problem, value]
  )

  const [solves, setSolves] = useState(null)
  const [solvesPending, setSolvesPending] = useState(false)
  const [solvesPage, setSolvesPage] = useState(1)
  const modalBodyRef = useRef(null)
  const handleSetSolvesPage = useCallback(
    async newPage => {
      const { kind, message, data } = await getSolves({
        challId: problem.id,
        limit: solvesPageSize,
        offset: (newPage - 1) * solvesPageSize,
      })
      if (kind !== 'goodChallengeSolves') {
        toast({ body: message, type: 'error' })
        return
      }
      setSolves(data.solves)
      setSolvesPage(newPage)
      modalBodyRef.current.scrollTop = 0
    },
    [problem.id, toast]
  )
  const onSolvesClick = useCallback(
    async e => {
      e.preventDefault()
      if (solvesPending) {
        return
      }
      setSolvesPending(true)
      const { kind, message, data } = await getSolves({
        challId: problem.id,
        limit: solvesPageSize,
        offset: 0,
      })
      setSolvesPending(false)
      if (kind !== 'goodChallengeSolves') {
        toast({ body: message, type: 'error' })
        return
      }
      setSolves(data.solves)
      setSolvesPage(1)
    },
    [problem.id, toast, solvesPending]
  )
  const onSolvesClose = useCallback(() => setSolves(null), [])

  return (
    <div className={`frame ${classes.frame}`}>
      <div className='frame__body'>
        <div className='row u-no-padding'>
          <div className='col-6 u-no-padding'>
            <div className='frame__title title'>
              {problem.category}/{problem.name}
            </div>
            <div className='frame__subtitle u-no-margin'>{problem.author}</div>
          </div>
          <div className='col-6 u-no-padding u-text-right'>
            <a
              className={`${classes.points} ${
                solvesPending ? classes.solvesPending : ''
              }`}
              onClick={onSolvesClick}
            >
              {problem.solves}
              {problem.solves === 1 ? ' solve / ' : ' solves / '}
              {problem.points}
              {problem.points === 1 ? ' point' : ' points'}
            </a>
          </div>
        </div>

        <div className='content-no-padding u-center'>
          <div className={`divider ${classes.divider}`} />
        </div>

        <div className={`${classes.description} frame__subtitle`}>
          <Markdown
            content={problem.description}
            components={markdownComponents}
          />
        </div>
        <form className='form-section' onSubmit={handleSubmit}>
          <div className='form-group'>
            <input
              autoComplete='off'
              autoCorrect='off'
              className={`form-group-input input-small ${classes.input} ${
                hasError ? 'input-error' : ''
              } ${solved ? 'input-success' : ''}`}
              placeholder={`Flag${solved ? ' (solved)' : ''}`}
              value={value}
              onChange={handleInputChange}
            />
            <button className={`form-group-btn btn-small ${classes.submit}`}>
              Submit
            </button>
          </div>
        </form>

        {hasDownloads && (
          <div>
            <p className='frame__subtitle u-no-margin'>Downloads</p>
            <div className='tag-container'>
              {problem.files.map(file => {
                return (
                  <div className={`tag ${classes.tag}`} key={file.url}>
                    <a download href={`${file.url}`}>
                      {file.name}
                    </a>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
      <SolvesDialog
        solves={solves}
        challName={problem.name}
        solveCount={problem.solves}
        pageSize={solvesPageSize}
        page={solvesPage}
        setPage={handleSetSolvesPage}
        onClose={onSolvesClose}
        modalBodyRef={modalBodyRef}
      />
    </div>
  )
}

export default withStyles(
  {
    frame: {
      marginBottom: '1em',
      paddingBottom: '0.625em',
      background: '#222',
    },
    description: {
      '& a': {
        display: 'inline',
        padding: 0,
      },
      '& p': {
        lineHeight: '1.4em',
        fontSize: '1em',
        marginTop: 0,
      },
      '& pre': {
        whiteSpace: 'pre-wrap',
      },
      '& blockquote': {
        background: 'transparent !important',
      },
    },
    divider: {
      margin: '0.625em',
      width: '80%',
    },
    points: {
      marginTop: '0.75rem !important',
      marginBottom: '0 !important',
      cursor: 'pointer',
      display: 'inline-block',
      transition: 'opacity ease-in-out 0.2s',
    },
    solvesPending: {
      opacity: '0.6',
      pointerEvents: 'none',
      cursor: 'default',
    },
    tag: {
      background: '#111',
    },
    input: {
      background: '#111',
      color: '#fff !important',
    },
    submit: {
      background: '#111',
      color: '#fff',
      '&:hover': {
        background: '#222',
      },
    },
  },
  Problem
)
