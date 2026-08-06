/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface WelcomeMerchantProps {
  storeName?: string
  name?: string
  storeUrl?: string
  dashboardUrl?: string
}

const WelcomeMerchantEmail = ({
  storeName = 'your store',
  name,
  storeUrl = '#',
  dashboardUrl = '#',
}: WelcomeMerchantProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to Pic To Cart! Your store is live 🎉</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Welcome to Pic To Cart! 🎉</Heading>
        <Text style={text}>{name ? `Hi ${name},` : 'Hi there,'}</Text>
        <Text style={text}>
          Congratulations! Your store <strong>{storeName}</strong> is now live and ready to accept orders.
        </Text>
        <Section style={{ margin: '24px 0' }}>
          <Text style={text}>
            Your storefront URL is: <a href={storeUrl} style={link}>{storeUrl}</a>
          </Text>
        </Section>
        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button href={storeUrl} style={button}>
            Visit Your Store
          </Button>
          <Button href={dashboardUrl} style={secondaryButton}>
            Go to Dashboard
          </Button>
        </Section>
        <Text style={text}>
          You can manage your products, adjust themes, configure shipping and payment options, and track orders directly from your merchant dashboard.
        </Text>
        <Text style={footer}>
          Need help? Email support@pictocart.in.<br />— The Pic To Cart Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeMerchantEmail,
  subject: (data: Record<string, any>) =>
    `Welcome to Pic To Cart! ${data?.storeName || 'your store'} is live 🎉`,
  displayName: 'Merchant welcome',
  previewData: {
    storeName: 'My Brand Store',
    name: 'Rahul',
    storeUrl: 'https://mybrand.pictocart.in',
    dashboardUrl: 'https://pictocart.in/dashboard',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}
const container = { maxWidth: '560px', margin: '0 auto', padding: '32px 24px 40px' }
const h1 = { fontSize: '24px', fontWeight: 700 as const, color: '#0F172A', margin: '0 0 16px', lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#334155', lineHeight: '1.6', margin: '0 0 18px' }
const link = { color: '#F97316', textDecoration: 'underline' }
const button = {
  backgroundColor: '#F97316',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 600 as const,
  borderRadius: '10px',
  padding: '14px 28px',
  textDecoration: 'none' as const,
  display: 'inline-block' as const,
  marginRight: '12px',
}
const secondaryButton = {
  backgroundColor: '#F1F5F9',
  color: '#334155',
  fontSize: '15px',
  fontWeight: 600 as const,
  borderRadius: '10px',
  padding: '14px 28px',
  textDecoration: 'none' as const,
  display: 'inline-block' as const,
}
const footer = { fontSize: '12px', color: '#94A3B8', lineHeight: '1.6', margin: '32px 0 0', paddingTop: '20px', borderTop: '1px solid #F1F5F9' }
