import * as React from 'react'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

import { brand } from './brand'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code</Preview>
    <Body style={brand.main}>
      <Container style={brand.container}>
        <Text style={brand.masthead}>Ask Intros</Text>
        <div style={brand.mastheadRule} />
        <Heading style={brand.h1}>Confirm reauthentication</Heading>
        <Text style={brand.text}>Use the code below to confirm your identity:</Text>
        <Text style={brand.code}>{token}</Text>
        <Text style={brand.footer}>
          This code will expire shortly. If you didn't request this, you can
          safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail
