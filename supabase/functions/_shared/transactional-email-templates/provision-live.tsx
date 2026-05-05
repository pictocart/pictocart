/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Pictocart'

interface Props {
  storeName?: string
  domain?: string
  projectUrl?: string
}

const ProvisionLiveEmail = ({ storeName, domain, projectUrl }: Props) => {
  const url = domain ? `https://${domain}` : projectUrl
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your store is live 🎉</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>🎉 Your store is live!</Heading>
          <Text style={text}>
            {storeName ? <><strong>{storeName}</strong> is</> : 'Your store is'} now live
            {domain ? <> at <strong>{domain}</strong></> : null}.
          </Text>
          {url ? (
            <Button href={url} style={button}>Visit your store</Button>
          ) : null}
          <Text style={text}>
            Log in to your dashboard to update photos, colors, products, and more — all changes go live instantly via Storefront → Customise.
          </Text>
          <Text style={footer}>
            Need help? Email support@pictocart.in.<br />— The {SITE_NAME} team
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ProvisionLiveEmail,
  subject: '🎉 Your store is live',
  displayName: 'Provision live',
  previewData: { storeName: 'My Store', domain: 'mybrand.com' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px' }
const h1 = { fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: '16px 0' }
const button = { backgroundColor: '#f97316', color: '#ffffff', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 'bold', display: 'inline-block', margin: '8px 0' }
const footer = { fontSize: '12px', color: '#64748b', margin: '24px 0 0', lineHeight: '1.5' }
