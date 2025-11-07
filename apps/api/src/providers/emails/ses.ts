import { promisify } from 'util'
import AWS from 'aws-sdk'
import type { Mail, MailProvider } from './base'

interface SesProviderOptions {
  awsKeyId: string
  awsKeySecret: string
  awsRegion: string
}

export class SesError extends Error {
  sesError: Error
  constructor(sesError: Error) {
    super(sesError.message)
    this.sesError = sesError
  }
}

export default class SesProvider implements MailProvider {
  private readonly sesSend: (
    params: AWS.SES.Types.SendEmailRequest
  ) => Promise<AWS.SES.Types.SendEmailResponse>

  constructor(_options: any) {
    const options = {
      awsKeyId: process.env.RCTF_SES_KEY_ID ?? _options.awsKeyId,
      awsKeySecret: process.env.RCTF_SES_KEY_SECRET ?? _options.awsKeySecret,
      awsRegion: process.env.RCTF_SES_REGION ?? _options.awsRegion,
    } as SesProviderOptions

    if (!options.awsKeyId || !options.awsKeySecret || !options.awsRegion) {
      throw new Error(
        `Missing one of the awsKeyId, awsKeySecret or awsRegion for the SES email provider.`
      )
    }

    const credentials = new AWS.Credentials({
      accessKeyId: options.awsKeyId,
      secretAccessKey: options.awsKeySecret,
    })
    const ses = new AWS.SES({
      credentials,
      region: options.awsRegion,
    })
    this.sesSend = promisify(ses.sendEmail.bind(ses))
  }

  async send(mail: Mail): Promise<void> {
    try {
      await this.sesSend({
        Destination: {
          ToAddresses: [mail.to],
        },
        Message: {
          Body: {
            Html: {
              Charset: 'UTF-8',
              Data: mail.html,
            },
            Text: {
              Charset: 'UTF-8',
              Data: mail.text,
            },
          },
          Subject: {
            Charset: 'UTF-8',
            Data: mail.subject,
          },
        },
        Source: mail.from,
      })
    } catch (e) {
      throw new SesError(e as Error)
    }
  }
}
