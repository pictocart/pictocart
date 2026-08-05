/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface ReplyMessageProps {
  storeName?: string
  message?: string
}

const ReplyMessageEmail = ({
  storeName = 'our store',
  message = '',
}: ReplyMessageProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Message from {storeName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Message from {storeName}</Heading>
        <Text style={text}>{message}</Text>
        <Text style={footer}>— The {storeName} team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ReplyMessageEmail,
  subject: (data: Record<string, any>) =>
    data?.subject || `Update from ${data?.storeName || 'store'}`,
  displayName: 'Reply Message',
  previewData: {
    storeName: 'PicToCart',
    message: 'Hello, this is a reply to your inquiry regarding your recent order cancellation.',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}
const container = { padding: '32px 24px', maxWidth: '560px' }
const h1 = { fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: '0 0 20px', lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#334155', lineHeight: '1.6', margin: '0 0 16px', whiteSpace: 'pre-wrap' }
const footer = { fontSize: '13px', color: '#94A3B8', margin: '24px 0 0' }
