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

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your {BRAND.name} password</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <span style={brandMark}>P</span>
          <span style={brandName}>{BRAND.name}</span>
        </Section>
        <Heading style={h1}>Reset your password</Heading>
        <Text style={text}>
          We got a request to reset the password for your {BRAND.name} account.
          Tap the button below to choose a new one — the link is valid for the
          next hour.
        </Text>
        <Section style={buttonWrap}>
          <Button style={button} href={confirmationUrl}>
            Reset my password
          </Button>
        </Section>
        <Text style={muted}>
          Didn't request a reset? You can safely ignore this email — your
          password will stay the same.
        </Text>
        <Text style={footer}>
          {BRAND.name} · {BRAND.tagline}
          <br />
          Need help? Reply to this email and our team will assist you.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail
