import { workerData, parentPort } from 'worker_threads'
import calculate from './calculate'
import type { WorkerRequest } from './types'

if (parentPort === null) {
  throw new Error('must be run in a worker thread')
}

const response = calculate(workerData as WorkerRequest)
parentPort.postMessage(response)
