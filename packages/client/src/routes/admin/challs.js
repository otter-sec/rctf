import { useState, useEffect, useCallback, useMemo } from 'preact/hooks'
import { v4 as uuid } from 'uuid'

import config from '../../config'
import withStyles from '../../components/jss'
import Problem from '../../components/admin/problem'

import { getChallenges } from '../../api/admin/challs'
import { hasChallsWritePermission } from '../../util/permissions'

const SAMPLE_PROBLEM = {
  name: '',
  descriptions: '',
  category: '',
  author: '',
  files: [],
  points: {
    min: 100,
    max: 500,
  },
}

const Challenges = ({ classes }) => {
  const [problems, setProblems] = useState([])

  // newId is the id of the new problem. this allows us to reuse code for problem creation
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const newId = useMemo(() => uuid(), [problems])

  // Check if the user has write permissions for challenges
  // if not, don't show the sample problem
  const hasChallsWritePerm = hasChallsWritePermission()
  const completeProblems = hasChallsWritePerm
    ? problems.concat({
        ...SAMPLE_PROBLEM,
        id: newId,
      })
    : problems

  useEffect(() => {
    document.title = `Admin Challenges | ${config.ctfName}`
  }, [])

  useEffect(() => {
    const action = async () => {
      setProblems(await getChallenges())
    }
    action()
  }, [])

  const updateProblem = useCallback(
    ({ problem }) => {
      let nextProblems = completeProblems

      // If we aren't creating new problem, remove sample problem first
      if (problem.id !== newId) {
        nextProblems = nextProblems.filter(p => p.id !== newId)
      }
      setProblems(
        nextProblems.map(p => {
          // Perform partial update by merging properties
          if (p.id === problem.id) {
            return {
              ...p,
              ...problem,
            }
          }
          return p
        })
      )
    },
    [newId, completeProblems]
  )

  return (
    <div className={`row ${classes.row}`}>
      <div className='col-9'>
        {completeProblems.length === 0 && (
          <div className='alert alert-info' style={{ textAlign: 'center' }}>
            <p>No challenges found</p>
          </div>
        )}
        {completeProblems.map(problem => {
          return (
            <Problem
              update={updateProblem}
              key={problem.id}
              problem={problem}
            />
          )
        })}
      </div>
    </div>
  )
}

export default withStyles(
  {
    row: {
      justifyContent: 'center',
    },
  },
  Challenges
)
