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

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <style>{brandDarkModeCss}</style>
    </Head>
    <Preview>You've been invited to join {siteName}</Preview>
    <Body style={brand.main}>
      <Container style={brand.container}>
        <Text style={brand.masthead}>Ask Intros</Text>
        <div style={brand.mastheadRule} />
        <Heading style={brand.h1}>You've been invited</Heading>
        <Text style={brand.text}>
          You've been invited to join{' '}
          <Link href={siteUrl} style={brand.link}>
            <strong>{siteName}</strong>
          </Link>
          . Click the button below to accept the invitation and create your
          account.
        </Text>
        <Button className="dm-btn" style={brand.button} href={confirmationUrl}>
          Accept Invitation
        </Button>
        <Text style={brand.footer}>
          If you weren't expecting this invitation, you can safely ignore this
          email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail
