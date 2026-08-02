// Shared so API and admin-bot redaction stay aligned.
export const sensitiveLogPaths = [
  'flag',
  'submittedFlag',
  'details.submittedFlag',
  'flags[*].flag',
  'input',
  'inputs',
]
