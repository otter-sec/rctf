import { SendEmailCommand, SESClient } from '@aws-sdk/client-ses'
import { MailProvider, type Mail } from './base'

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

export default class SesProvider extends MailProvider {
  private readonly client: SESClient

  constructor(_options: any) {
    super()
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

    this.client = new SESClient({
      region: options.awsRegion,
      credentials: {
        accessKeyId: options.awsKeyId,
        secretAccessKey: options.awsKeySecret,
      },
    })
  }

  async send(mail: Mail): Promise<void> {
    try {
      await this.client.send(
        new SendEmailCommand({
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
      )
    } catch (e) {
      throw new SesError(e as Error)
    }
  }
}
