/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

import {
  BRAND,
  brandMark,
  brandName,
  button,
  buttonWrap,
  container,
  footer,
  h1,
  header,
  main,
  muted,
  text,
} from './_brand.ts'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your new email for {BRAND.name}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <span style={brandMark}>P</span>
          <span style={brandName}>{BRAND.name}</span>
        </Section>
        <Heading style={h1}>Confirm your email change</Heading>
        <Text style={text}>
          You requested to change the email on your {BRAND.name} account from{' '}
          <strong>{oldEmail}</strong> to <strong>{newEmail}</strong>.
        </Text>
        <Text style={text}>
          Tap below to confirm — once approved, you'll sign in with your new
          email.
        </Text>
        <Section style={buttonWrap}>
          <Button style={button} href={confirmationUrl}>
            Confirm email change
          </Button>
        </Section>
        <Text style={muted}>
          If you didn't request this, please secure your account immediately by
          resetting your password.
        </Text>
        <Text style={footer}>
          {BRAND.name} · {BRAND.tagline}
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail
