import {
  instanceDetailsSchema,
  instancerErrorSchema,
  type CreateInstanceOptions,
  type instanceDetailsOrError,
  type InstanceQueryOptions,
  type InstancerProvider,
} from './base'

interface RctfCompatProviderOptions {
  authToken: string
  apiUrl: string
}

export default class RctfCompatProvider implements InstancerProvider {
  private readonly authToken: string
  private readonly apiUrl: string

  constructor(_options: any) {
    const options = {
      authToken: process.env.RCTF_COMPAT_AUTH_TOKEN ?? _options.authToken,
      apiUrl: process.env.RCTF_COMPAT_API_URL ?? _options.apiUrl,
    } as RctfCompatProviderOptions

    if (!options.authToken || !options.apiUrl) {
      throw new Error(
        `Missing one of the authToken or apiUrl for the RctfCompatProvider.`
      )
    }

    this.authToken = options.authToken
    this.apiUrl = options.apiUrl.replace(/\/$/, '')
  }

  private async apiRequest(
    path: string,
    method: 'POST' | 'PUT' | 'DELETE',
    body?: any
  ): Promise<instanceDetailsOrError> {
    const response = await fetch(`${this.apiUrl}/${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = (await response.json()) as instanceDetailsOrError
    if (data.kind === instancerErrorSchema.shape.kind.value) {
      return instancerErrorSchema.parse(data)
    }

    return instanceDetailsSchema.parse(data)
  }

  createInstance = async (
    options: CreateInstanceOptions
  ): Promise<instanceDetailsOrError> => {
    return this.apiRequest('v1/instances/', 'PUT', {
      kind: 'instancerCreateInstanceForm',
      rctfAuthToken: this.authToken,
      ...options,
    })
  }

  deleteInstance = async (
    options: InstanceQueryOptions
  ): Promise<instanceDetailsOrError> => {
    return this.apiRequest('v1/instances/', 'DELETE', {
      kind: 'instancerDeleteInstanceForm',
      rctfAuthToken: this.authToken,
      ...options,
    })
  }

  getInstance = async (
    options: InstanceQueryOptions
  ): Promise<instanceDetailsOrError> => {
    return this.apiRequest('v1/instances/', 'POST', {
      kind: 'instancerGetInstanceForm',
      rctfAuthToken: this.authToken,
      ...options,
    })
  }
}
