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

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your secure sign-in link for {BRAND.name}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <span style={brandMark}>P</span>
          <span style={brandName}>{BRAND.name}</span>
        </Section>
        <Heading style={h1}>Sign in to {BRAND.name}</Heading>
        <Text style={text}>
          Tap the button below to log in to your {BRAND.name} dashboard. For
          your security, this link expires shortly and can only be used once.
        </Text>
        <Section style={buttonWrap}>
          <Button style={button} href={confirmationUrl}>
            Log in to my dashboard
          </Button>
        </Section>
        <Text style={muted}>
          Didn't try to sign in? You can safely ignore this email.
        </Text>
        <Text style={footer}>
          {BRAND.name} · {BRAND.tagline}
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail
