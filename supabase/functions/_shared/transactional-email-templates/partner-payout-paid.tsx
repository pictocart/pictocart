/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Pic To Cart'

interface Props {
  partnerName?: string
  amountInr?: number
  utr?: string
  method?: string
  periodLabel?: string
  commissionCount?: number
}

const PartnerPayoutPaidEmail = ({
  partnerName,
  amountInr = 0,
  utr,
  method = 'UPI',
  periodLabel,
  commissionCount = 0,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {SITE_NAME} payout of ₹{amountInr.toLocaleString('en-IN')} is on the way</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>💸 Payout sent</Heading>
        <Text style={text}>Hi {partnerName || 'Partner'},</Text>
        <Text style={text}>
          Good news — we've just released your commission payout
          {periodLabel ? <> for <strong>{periodLabel}</strong></> : null}.
        </Text>
        <Section style={card}>
          <Text style={kv}><strong>Amount:</strong> ₹{amountInr.toLocaleString('en-IN')}</Text>
          <Text style={kv}><strong>Method:</strong> {method.toUpperCase()}</Text>
          {utr ? <Text style={kv}><strong>UTR / Reference:</strong> {utr}</Text> : null}
          <Text style={kv}><strong>Commissions covered:</strong> {commissionCount}</Text>
        </Section>
        <Text style={text}>
          The amount should reflect in your account within 1–2 working days.
          You can view the full breakdown in your partner dashboard.
        </Text>
        <Hr style={{ borderColor: '#eee', margin: '24px 0' }} />
        <Text style={footer}>Thanks for growing {SITE_NAME} with us. 🙏</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PartnerPayoutPaidEmail,
  subject: (data: Record<string, any>) =>
    `Payout of ₹${Number(data?.amountInr ?? 0).toLocaleString('en-IN')} sent — ${SITE_NAME}`,
  displayName: 'Partner payout paid',
  previewData: { partnerName: 'Riya', amountInr: 4200, utr: 'AXIS12345', method: 'upi', periodLabel: 'Jun 2026', commissionCount: 8 },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', color: '#0f172a', margin: '0 0 12px' }
const text = { fontSize: '15px', color: '#334155', lineHeight: '22px' }
const kv = { fontSize: '14px', color: '#0f172a', margin: '4px 0' }
const card = { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px 18px', margin: '16px 0' }
const footer = { fontSize: '13px', color: '#64748b' }
