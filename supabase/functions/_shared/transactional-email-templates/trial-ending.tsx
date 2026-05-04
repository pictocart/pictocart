/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Pictocart'
const BILLING_URL = 'https://pictocart.in/billing'

interface TrialEndingProps {
  name?: string
  storeName?: string
  daysLeft?: number
  planName?: string
  endDate?: string
}

const TrialEndingEmail = ({
  name,
  storeName,
  daysLeft = 3,
  planName = 'Starter',
  endDate,
}: TrialEndingProps) => {
  const greeting = name ? `Hi ${name},` : 'Hi there,'
  const dayWord = daysLeft === 1 ? 'day' : 'days'
  const urgent = daysLeft <= 1

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        Your {planName} trial ends in {daysLeft} {dayWord} — keep your store live
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {urgent ? '⏰ Your trial ends tomorrow' : `Your trial ends in ${daysLeft} days`}
          </Heading>
          <Text style={text}>{greeting}</Text>
          <Text style={text}>
            Just a quick heads-up — your <strong>{planName}</strong> trial
            {storeName ? ` for ${storeName}` : ''} ends
            {endDate ? ` on ${endDate}` : ` in ${daysLeft} ${dayWord}`}.
          </Text>
          <Text style={text}>
            To keep your store published, payments active, and customers
            ordering without interruption, add a payment method now. It only
            takes a minute.
          </Text>
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button href={BILLING_URL} style={button}>
              Continue with {planName}
            </Button>
          </Section>
          <Text style={muted}>
            Questions? Just reply to this email — we're here to help.
          </Text>
          <Text style={footer}>— The {SITE_NAME} team</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: TrialEndingEmail,
  subject: (data: Record<string, any>) => {
    const d = (data?.daysLeft as number) ?? 3
    return d <= 1
      ? `Your ${SITE_NAME} trial ends tomorrow`
      : `Your ${SITE_NAME} trial ends in ${d} days`
  },
  displayName: 'Trial ending reminder',
  previewData: {
    name: 'Aarav',
    storeName: 'Aarav Crafts',
    daysLeft: 3,
    planName: 'Starter',
    endDate: '7 May 2026',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}
const container = { padding: '32px 24px', maxWidth: '560px' }
const h1 = {
  fontSize: '24px',
  fontWeight: 700,
  color: '#0F172A',
  margin: '0 0 24px',
  lineHeight: '1.3',
}
const text = {
  fontSize: '15px',
  color: '#334155',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const muted = {
  fontSize: '14px',
  color: '#64748B',
  lineHeight: '1.6',
  margin: '24px 0 0',
}
const footer = { fontSize: '13px', color: '#94A3B8', margin: '24px 0 0' }
const button = {
  backgroundColor: '#F97316',
  color: '#ffffff',
  padding: '14px 28px',
  borderRadius: '8px',
  fontWeight: 600,
  fontSize: '15px',
  textDecoration: 'none',
  display: 'inline-block',
}
