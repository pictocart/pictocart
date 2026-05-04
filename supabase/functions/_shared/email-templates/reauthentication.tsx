/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
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
  codeStyle,
  container,
  footer,
  h1,
  header,
  main,
  muted,
  text,
} from './_brand.ts'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {BRAND.name} verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <span style={brandMark}>P</span>
          <span style={brandName}>{BRAND.name}</span>
        </Section>
        <Heading style={h1}>Verify it's you</Heading>
        <Text style={text}>
          Enter this code in {BRAND.name} to confirm your identity:
        </Text>
        <Section style={{ textAlign: 'center' }}>
          <Text style={codeStyle}>{token}</Text>
        </Section>
        <Text style={muted}>
          This code expires shortly. If you didn't request it, please reset
          your password — someone may be trying to access your account.
        </Text>
        <Text style={footer}>
          {BRAND.name} · {BRAND.tagline}
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail
