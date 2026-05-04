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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ recipient, confirmationUrl }: SignupEmailProps) => (
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
          store in minutes. Please confirm <strong>{recipient}</strong> so we
          can save your work and start setting up your store.
        </Text>
        <Section style={buttonWrap}>
          <Button style={button} href={confirmationUrl}>
            Confirm email & continue
          </Button>
        </Section>
        <Text style={muted}>
          Didn't sign up for {BRAND.name}? You can safely ignore this email.
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
