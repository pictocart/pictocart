/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Pictocart'
const RECHARGE_URL = 'https://pictocart.in/wallet'

interface Props {
  name?: string
  storeName?: string
  balance?: number
  threshold?: 'low' | 'critical' | 'zero'
}

const LowBalanceEmail = ({ name, storeName, balance = 0, threshold = 'low' }: Props) => {
  const greeting = name ? `Hi ${name},` : 'Hi there,'
  const isZero = threshold === 'zero'
  const isCritical = threshold === 'critical' || isZero
  const heading = isZero ? '⚠️ Your AI credits are exhausted' : isCritical ? '⚠️ Critical: low AI credits' : 'Heads up — your AI credits are running low'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{heading}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{heading}</Heading>
          <Text style={text}>{greeting}</Text>
          <Text style={text}>
            Your AI credit balance{storeName ? ` for ${storeName}` : ''} is now <strong>{balance.toLocaleString('en-IN')}</strong> credits.
            {isZero
              ? ' AI features (product generation, theme refining, blog drafting) are paused until you top up.'
              : ' Top up now to keep AI features running smoothly.'}
          </Text>
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button href={RECHARGE_URL} style={button}>Recharge wallet</Button>
          </Section>
          <Text style={footer}>— The {SITE_NAME} team</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: LowBalanceEmail,
  subject: (data: Record<string, any>) => {
    const t = data?.threshold as string
    if (t === 'zero') return `Your ${SITE_NAME} AI credits are exhausted`
    if (t === 'critical') return `Critical: only ${data?.balance ?? 0} AI credits left`
    return `Your ${SITE_NAME} AI credits are running low`
  },
  displayName: 'Low credit balance alert',
  previewData: { name: 'Aarav', storeName: 'Aarav Crafts', balance: 45, threshold: 'critical' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const container = { padding: '32px 24px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: '0 0 24px', lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#334155', lineHeight: '1.6', margin: '0 0 16px' }
const footer = { fontSize: '13px', color: '#94A3B8', margin: '24px 0 0' }
const button = { backgroundColor: '#F97316', color: '#ffffff', padding: '14px 28px', borderRadius: '8px', fontWeight: 600, fontSize: '15px', textDecoration: 'none', display: 'inline-block' }
