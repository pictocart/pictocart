/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Pictocart'

interface Props {
  storeName?: string
  requestedDomain?: string
}

const ProvisionRequestReceivedEmail = ({ storeName, requestedDomain }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We're setting up your store on {requestedDomain ?? 'your domain'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>We've got your domain request 🚀</Heading>
        <Text style={text}>
          Thanks for connecting <strong>{requestedDomain ?? 'your domain'}</strong>
          {storeName ? <> to <strong>{storeName}</strong></> : null}.
        </Text>
        <Text style={text}>
          Our team is now building your dedicated, lightning-fast storefront with the theme you picked.
          You'll receive another email within <strong>24 hours</strong> with a direct link to your live store
          and any DNS instructions for your registrar (if needed).
        </Text>
        <Section style={infoBox}>
          <Text style={infoText}>
            In the meantime your existing store keeps running at its default URL — no downtime.
          </Text>
        </Section>
        <Text style={footer}>
          Questions? Just reply to this email or write to support@pictocart.in.
          <br />— The {SITE_NAME} team
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ProvisionRequestReceivedEmail,
  subject: 'We\'re setting up your custom domain',
  displayName: 'Provision request received',
  previewData: { storeName: 'My Store', requestedDomain: 'mybrand.com' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: '0 0 16px' }
const infoBox = { backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '12px 16px', margin: '16px 0' }
const infoText = { fontSize: '13px', color: '#9a3412', margin: 0 }
const footer = { fontSize: '12px', color: '#64748b', margin: '24px 0 0', lineHeight: '1.5' }
