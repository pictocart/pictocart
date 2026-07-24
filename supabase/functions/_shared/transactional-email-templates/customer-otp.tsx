/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface CustomerOtpProps {
  storeName?: string
  otp?: string
  purpose?: string
}

const CustomerOtpEmail = ({
  storeName = 'our store',
  otp = '000000',
  purpose = 'verification',
}: CustomerOtpProps) => {
  const isReset = purpose.toLowerCase().includes('reset');
  const actionText = isReset
    ? 'You requested a password reset. Use the code below:'
    : 'Verify your email address to create your account.';

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{otp} is your {storeName} code</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{storeName}</Heading>
          <Text style={text}>{actionText}</Text>
          
          <Section style={codeContainer}>
            <Text style={codeMuted}>Your verification code</Text>
            <Heading style={codeText}>{otp}</Heading>
          </Section>

          <Text style={muted}>
            This code expires in <strong>10 minutes</strong>.<br />
            If you did not request this, please ignore this email.
          </Text>
          <Text style={footer}>Powered by Pic To Cart</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: CustomerOtpEmail,
  subject: (data: Record<string, any>) => {
    const isReset = String(data?.purpose || '').toLowerCase().includes('reset');
    return isReset
      ? `${data?.otp || '000000'} — your ${data?.storeName || 'our store'} password reset code`
      : `${data?.otp || '000000'} is your ${data?.storeName || 'our store'} verification code`;
  },
  displayName: 'Customer OTP',
  previewData: {
    storeName: 'Vogue Elite',
    otp: '878586',
    purpose: 'verification',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#f8fafc',
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  padding: '48px 16px',
}
const container = {
  maxWidth: '500px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  border: '1px solid #e2e8f0',
  padding: '40px 32px 32px 32px',
  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)',
}
const h1 = {
  fontSize: '26px',
  fontWeight: 800 as const,
  color: '#0f172a',
  margin: '0 0 12px 0',
  lineHeight: '1.3',
  textAlign: 'center' as const,
  letterSpacing: '-0.025em',
}
const text = {
  fontSize: '15px',
  color: '#475569',
  lineHeight: '1.6',
  margin: '0 0 32px 0',
  textAlign: 'center' as const,
}
const codeContainer = {
  background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
  borderRadius: '14px',
  padding: '28px 16px',
  textAlign: 'center' as const,
  margin: '0 0 32px 0',
  boxShadow: '0 10px 25px rgba(79, 70, 229, 0.15)',
}
const codeMuted = {
  margin: '0 0 12px 0',
  fontSize: '11px',
  fontWeight: 700 as const,
  color: 'rgba(255, 255, 255, 0.85)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.15em',
}
const codeText = {
  margin: '0',
  fontSize: '42px',
  fontWeight: 800 as const,
  letterSpacing: '0.25em',
  color: '#ffffff',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
}
const muted = {
  fontSize: '13px',
  color: '#64748b',
  lineHeight: '1.5',
  margin: '0 0 28px 0',
  textAlign: 'center' as const,
}
const footer = {
  fontSize: '11px',
  color: '#94a3b8',
  lineHeight: '1.6',
  margin: '0',
  textAlign: 'center' as const,
  letterSpacing: '0.05em',
  textTransform: 'uppercase' as const,
  paddingTop: '24px',
  borderTop: '1px solid #f1f5f9',
}
