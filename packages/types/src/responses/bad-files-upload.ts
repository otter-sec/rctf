import { response } from '../internal'

export const BadFilesUpload = response('badFilesUpload', {
  status: 500,
  message: 'The upload of files failed.',
})
