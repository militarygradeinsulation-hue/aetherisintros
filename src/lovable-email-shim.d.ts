/**
 * Type stubs for Lovable platform packages injected at runtime.
 * These packages are resolved by Lovable's build infrastructure and don't
 * exist on npm; these declarations silence tsc in local development.
 */

declare module '@lovable.dev/email-js' {
  export class EmailAPIError extends Error {
    statusCode: number
    code: string
    body: unknown
  }

  export interface FromAddress {
    name: string
    address: string
  }

  export interface SendLovableEmailPayload {
    to: string
    from: FromAddress
    sender_domain: string
    subject: string
    html: string
    text?: string
    purpose?: string
    label?: string
    idempotency_key?: string
    reply_to?: string
  }

  export interface SendLovableEmailConfig {
    apiKey: string
    sendUrl?: string | undefined
  }

  export interface SendEmailResult {
    id: string
  }

  export function sendLovableEmail(
    payload: SendLovableEmailPayload,
    config: SendLovableEmailConfig
  ): Promise<SendEmailResult>

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type EmailRender = (data: any) => import('react').ReactElement

  export interface EmailTypeConfig {
    subject: string
    render: EmailRender
  }

  export interface AuthEmailHandlerOptions {
    apiKey: string
    from: FromAddress
    senderDomain: string
    sendUrl?: string | undefined
    emails: Record<string, EmailTypeConfig>
  }

  export function createAuthEmailHandler(
    options: AuthEmailHandlerOptions
  ): (request: Request) => Promise<Response>
}
