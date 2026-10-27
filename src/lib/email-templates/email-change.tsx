import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components'

import { brand, brandDarkModeCss } from './brand'

interface EmailChangeEmailProps {
  siteName: string
  // oldEmail is the user's current address (HookData.OldEmail). For the
  // NEW-recipient half of a secure email_change fanout, `email` equals the
  // recipient (NEW), so the "from" line must render oldEmail to read
  // "from OLD to NEW" instead of "from NEW to NEW".
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <style>{brandDarkModeCss}</style>
    </Head>
    <Preview>Confirm your email change for {siteName}</Preview>
    <Body style={brand.main}>
      <Container style={brand.container}>
        <Text style={brand.masthead}>Ask Intros</Text>
        <div style={brand.mastheadRule} />
        <Heading style={brand.h1}>Confirm your email change</Heading>
        <Text style={brand.text}>
          You requested to change your email address for {siteName} from{' '}
          <Link href={`mailto:${oldEmail}`} style={brand.link}>
            {oldEmail}
          </Link>{' '}
          to{' '}
          <Link href={`mailto:${newEmail}`} style={brand.link}>
            {newEmail}
          </Link>
          .
        </Text>
        <Text style={brand.text}>
          Click the button below to confirm this change:
        </Text>
        <Button className="dm-btn" style={brand.button} href={confirmationUrl}>
          Confirm Email Change
        </Button>
        <Text style={brand.footer}>
          If you didn't request this change, please secure your account
          immediately.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail
