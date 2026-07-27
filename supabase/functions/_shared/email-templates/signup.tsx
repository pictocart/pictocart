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
  codeStyle,
  container,
  footer,
  h1,
  header,
  main,
  muted,
  text,
} from './_brand.ts'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  token: string
}

export const SignupEmail = ({ recipient, token }: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email to launch your {BRAND.name} store</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <span style={brandMark}>P</span>
          <span style={brandName}>{BRAND.name}</span>
        </Section>
        <Heading style={h1}>One last step — confirm your email</Heading>
        <Text style={text}>Hi there,</Text>
        <Text style={text}>
          Welcome to {BRAND.name}! We're excited to help you launch your online
          store in minutes. Please use the verification code below to confirm
          your email address (<strong>{recipient}</strong>):
        </Text>
        <Section style={{ textAlign: 'center' }}>
          <Text style={codeStyle}>{token}</Text>
        </Section>
        <Text style={muted}>
          This code is valid for <strong>2 minutes</strong>. If you did not sign up for {BRAND.name}, you can safely ignore this email.
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

export default SignupEmail
