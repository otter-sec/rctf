import { promisify } from 'util'
import AWS from 'aws-sdk'
import { Provider, Mail } from '../../../email/provider'

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

export default class SesProvider implements Provider {
  private readonly sesSend: (
    params: AWS.SES.Types.SendEmailRequest
  ) => Promise<AWS.SES.Types.SendEmailResponse>

  constructor(_options: Partial<SesProviderOptions>) {
    const options = {
      awsKeyId: process.env.RCTF_SES_KEY_ID ?? _options.awsKeyId,
      awsKeySecret: process.env.RCTF_SES_KEY_SECRET ?? _options.awsKeySecret,
      awsRegion: process.env.RCTF_SES_REGION ?? _options.awsRegion,
    } as SesProviderOptions
    // TODO: validate that all options are indeed provided

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
      // TODO: remove cast? (since e could technically not be Error)
      throw new SesError(e as Error)
    }
  }
}
