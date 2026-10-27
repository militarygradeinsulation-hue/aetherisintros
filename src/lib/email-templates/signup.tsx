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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <style>{brandDarkModeCss}</style>
    </Head>
    <Preview>Confirm your email for {siteName}</Preview>
    <Body style={brand.main}>
      <Container style={brand.container}>
        <Text style={brand.masthead}>Ask Intros</Text>
        <div style={brand.mastheadRule} />
        <Heading style={brand.h1}>Confirm your email</Heading>
        <Text style={brand.text}>
          Thanks for joining{' '}
          <Link href={siteUrl} style={brand.link}>
            <strong>{siteName}</strong>
          </Link>
          . Know who matters. Know why now.
        </Text>
        <Text style={brand.text}>
          Please confirm your email address (
          <Link href={`mailto:${recipient}`} style={brand.link}>
            {recipient}
          </Link>
          ) by clicking the button below:
        </Text>
        <Button className="dm-btn" style={brand.button} href={confirmationUrl}>
          Verify Email
        </Button>
        <Text style={brand.footer}>
          If you didn't create an account, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail
