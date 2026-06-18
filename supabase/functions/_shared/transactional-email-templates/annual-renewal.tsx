/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Pic To Cart'
const BILLING_URL = 'https://pictocart.in/dashboard/billing'

interface Props {
  storeName?: string
  planName?: string
  daysLeft?: number
  endDate?: string
  amountInr?: number
}

const AnnualRenewalEmail = ({ storeName, planName = 'Starter', daysLeft = 30, endDate, amountInr }: Props) => {
  const urgent = daysLeft <= 1
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your {planName} annual plan renews in {daysLeft} day(s)</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {urgent ? '⏰ Your annual plan expires tomorrow' : `Renew in ${daysLeft} days`}
          </Heading>
          <Text style={text}>Hi there,</Text>
          <Text style={text}>
            Your <strong>{planName}</strong> annual plan{storeName ? ` for ${storeName}` : ''} expires
            {endDate ? ` on ${endDate}` : ` in ${daysLeft} days`}
            {amountInr ? <> — renewal amount <strong>₹{amountInr.toLocaleString('en-IN')}</strong></> : null}.
          </Text>
          <Text style={text}>
            Renew now to keep your store published, payments active, and customers ordering without interruption.
          </Text>
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button href={BILLING_URL} style={button}>Renew {planName}</Button>
          </Section>
          <Text style={footer}>— The {SITE_NAME} team</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: AnnualRenewalEmail,
  subject: (data: Record<string, any>) => {
    const d = (data?.daysLeft as number) ?? 30
    return d <= 1
      ? `Your ${SITE_NAME} annual plan expires tomorrow`
      : `Your ${SITE_NAME} annual plan renews in ${d} days`
  },
  displayName: 'Annual plan renewal reminder',
  previewData: { storeName: 'Aarav Crafts', planName: 'Starter', daysLeft: 7, endDate: '7 Jul 2026', amountInr: 5500 },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const container = { padding: '32px 24px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: '0 0 24px', lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#334155', lineHeight: '1.6', margin: '0 0 16px' }
const footer = { fontSize: '13px', color: '#94A3B8', margin: '24px 0 0' }
const button = {
  backgroundColor: '#F97316', color: '#ffffff', padding: '14px 28px', borderRadius: '8px',
  fontWeight: 600, fontSize: '15px', textDecoration: 'none', display: 'inline-block',
}
