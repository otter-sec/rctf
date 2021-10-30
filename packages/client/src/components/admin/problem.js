import { Fragment } from 'preact'
import withStyles from '../../components/jss'
import { useState, useCallback } from 'preact/hooks'
import Modal from '../../components/modal'

import {
  updateChallenge,
  deleteChallenge,
  uploadFiles,
} from '../../api/admin/challs'
import { useToast } from '../../components/toast'
import { encodeFile } from '../../util'

const DeleteModal = withStyles(
  {
    modalBody: {
      paddingTop: '0em !important', // reduce space between header and body
    },
    controls: {
      display: 'flex',
      justifyContent: 'center',
      '& :first-child': {
        marginLeft: '0em',
      },
      '& :last-child': {
        marginRight: '0em',
      },
    },
  },
  ({ open, onClose, onDelete, classes }) => {
    const wrappedOnClose = useCallback(
      e => {
        e.preventDefault()
        onClose()
      },
      [onClose]
    )
    const wrappedOnDelete = useCallback(
      e => {
        e.preventDefault()
        onDelete()
      },
      [onDelete]
    )

    return (
      <Modal open={open} onClose={onClose}>
        <div className='modal-header'>
          <div className='modal-title'>Delete Challenge?</div>
        </div>
        <div className={`modal-body ${classes.modalBody}`}>
          This is an irreversible action that permanently deletes the challenge
          and revokes all solves.
          <div className={classes.controls}>
            <div className='btn-container u-inline-block'>
              <button
                type='button'
                className='btn-small'
                onClick={wrappedOnClose}
              >
                Cancel
              </button>
            </div>
            <div className='btn-container u-inline-block'>
              <button
                type='submit'
                className='btn-small btn-danger'
                onClick={wrappedOnDelete}
              >
                Delete Challenge
              </button>
            </div>
          </div>
        </div>
      </Modal>
    )
  }
)

const Problem = ({ classes, problem, update: updateClient }) => {
  const { toast } = useToast()

  const [flag, setFlag] = useState(problem.flag)
  const handleFlagChange = useCallback(e => setFlag(e.target.value), [])

  const [description, setDescription] = useState(problem.description)
  const handleDescriptionChange = useCallback(
    e => setDescription(e.target.value),
    []
  )

  const [category, setCategory] = useState(problem.category)
  const handleCategoryChange = useCallback(e => setCategory(e.target.value), [])

  const [author, setAuthor] = useState(problem.author)
  const handleAuthorChange = useCallback(e => setAuthor(e.target.value), [])

  const [name, setName] = useState(problem.name)
  const handleNameChange = useCallback(e => setName(e.target.value), [])

  const [minPoints, setMinPoints] = useState(problem.points.min)
  const handleMinPointsChange = useCallback(
    e => setMinPoints(Number.parseInt(e.target.value)),
    []
  )

  const [maxPoints, setMaxPoints] = useState(problem.points.max)
  const handleMaxPointsChange = useCallback(
    e => setMaxPoints(Number.parseInt(e.target.value)),
    []
  )

  const [tiebreakEligible, setTiebreakEligible] = useState(
    problem.tiebreakEligible !== false
  )
  const handleTiebreakEligibleChange = useCallback(
    e => setTiebreakEligible(e.target.checked),
    []
  )

  const handleFileUpload = useCallback(
    async e => {
      e.preventDefault()

      const fileData = await Promise.all(
        Array.from(e.target.files).map(async file => {
          const data = await encodeFile(file)

          return {
            data,
            name: file.name,
          }
        })
      )

      const fileUpload = await uploadFiles({
        files: fileData,
      })

      if (fileUpload.error) {
        toast({ body: fileUpload.error, type: 'error' })
        return
      }

      const data = await updateChallenge({
        id: problem.id,
        data: {
          files: fileUpload.data.concat(problem.files),
        },
      })

      e.target.value = null

      updateClient({
        problem: data,
      })

      toast({ body: 'Problem successfully updated' })
    },
    [problem.id, problem.files, updateClient, toast]
  )

  const handleRemoveFile = file => async () => {
    const newFiles = problem.files.filter(f => f !== file)

    const data = await updateChallenge({
      id: problem.id,
      data: {
        files: newFiles,
      },
    })

    updateClient({
      problem: data,
    })

    toast({ body: 'Problem successfully updated' })
  }

  const handleUpdate = async e => {
    e.preventDefault()

    const data = await updateChallenge({
      id: problem.id,
      data: {
        flag,
        description,
        category,
        author,
        name,
        tiebreakEligible,
        points: {
          min: minPoints,
          max: maxPoints,
        },
      },
    })

    updateClient({
      problem: data,
    })

    toast({ body: 'Problem successfully updated' })
  }

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const openDeleteModal = useCallback(e => {
    e.preventDefault()
    setIsDeleteModalOpen(true)
  }, [])
  const closeDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false)
  }, [])
  const handleDelete = useCallback(() => {
    const action = async () => {
      await deleteChallenge({
        id: problem.id,
      })
      toast({
        body: `${problem.name} successfully deleted`,
        type: 'success',
      })
      closeDeleteModal()
    }
    action()
  }, [problem, toast, closeDeleteModal])

  return (
    <Fragment>
      <div className={`frame ${classes.frame}`}>
        <div className='frame__body'>
          <form onSubmit={handleUpdate}>
            <div className='row u-no-padding'>
              <div className={`col-6 ${classes.header}`}>
                <input
                  autoComplete='off'
                  autoCorrect='off'
                  required
                  className='form-group-input input-small'
                  placeholder='Category'
                  value={category}
                  onChange={handleCategoryChange}
                />
                <input
                  autoComplete='off'
                  autoCorrect='off'
                  required
                  className='form-group-input input-small'
                  placeholder='Problem Name'
                  value={name}
                  onChange={handleNameChange}
                />
                <div className='form-ext-control form-ext-checkbox'>
                  <input
                    id={`chall-${problem.id}-tiebreak-eligible`}
                    type='checkbox'
                    className='form-ext-input'
                    checked={tiebreakEligible}
                    onChange={handleTiebreakEligibleChange}
                  />
                  <label
                    htmlFor={`chall-${problem.id}-tiebreak-eligible`}
                    className='form-ext-label'
                  >
                    Eligible for tiebreaks?
                  </label>
                </div>
              </div>
              <div className={`col-6 ${classes.header}`}>
                <input
                  autoComplete='off'
                  autoCorrect='off'
                  required
                  className='form-group-input input-small'
                  placeholder='Author'
                  value={author}
                  onChange={handleAuthorChange}
                />
                <input
                  className='form-group-input input-small'
                  type='number'
                  required
                  value={minPoints}
                  onChange={handleMinPointsChange}
                />
                <input
                  className='form-group-input input-small'
                  type='number'
                  required
                  value={maxPoints}
                  onChange={handleMaxPointsChange}
                />
              </div>
            </div>

            <div className='content-no-padding u-center'>
              <div className={`divider ${classes.divider}`} />
            </div>

            <textarea
              autoComplete='off'
              autoCorrect='off'
              placeholder='Description'
              value={description}
              onChange={handleDescriptionChange}
            />
            <div className='input-control'>
              <input
                autoComplete='off'
                autoCorrect='off'
                required
                className='form-group-input input-small'
                placeholder='Flag'
                value={flag}
                onChange={handleFlagChange}
              />
            </div>

            {problem.files.length !== 0 && (
              <div>
                <p
                  className={`frame__subtitle u-no-margin ${classes.downloadsHeader}`}
                >
                  Downloads
                </p>
                <div className='tag-container'>
                  {problem.files.map(file => {
                    return (
                      <div className={`tag ${classes.tag}`} key={file.url}>
                        <a download href={file.url}>
                          {file.name}
                        </a>
                        <div
                          className='tag tag--delete'
                          style='margin: 0; margin-left: 3px'
                          onClick={handleRemoveFile(file)}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className='input-control'>
              <input
                className='form-group-input input-small'
                type='file'
                multiple
                onChange={handleFileUpload}
              />
            </div>

            <div className={`form-section ${classes.controls}`}>
              <button className='btn-small btn-info'>Update</button>
              <button
                className='btn-small btn-danger'
                onClick={openDeleteModal}
                type='button'
              >
                Delete
              </button>
            </div>
          </form>
        </div>
      </div>
      <DeleteModal
        open={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onDelete={handleDelete}
      />
    </Fragment>
  )
}

export default withStyles(
  {
    frame: {
      marginBottom: '1em',
      paddingBottom: '0.625em',
      background: '#222',
      '& input, & textarea': {
        color: '#fff !important',
        background: '#111',
      },
    },
    downloadsHeader: {
      color: '#fff !important',
    },
    description: {
      '& a': {
        display: 'inline',
        padding: 0,
      },
    },
    tag: {
      background: '#111',
    },
    divider: {
      margin: '0.625em !important',
      width: '80% !important',
    },
    header: {
      marginTop: '15px',
      '& input': {
        margin: '5px 0',
      },
    },
    controls: {
      display: 'flex',
      justifyContent: 'space-between',
    },
    tiebreak: {
      margin: 'auto',
    },
  },
  Problem
)
