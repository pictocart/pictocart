// Shared Pic to Cart brand tokens for auth email templates.
// Body bg MUST stay white (#ffffff) — email client requirement.

export const BRAND = {
  name: 'Pic to Cart',
  tagline: 'Your store. Live in 5 minutes.',
  url: 'https://pictocart.in',
  supportEmail: 'support@pictocart.in',
}

export const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  margin: 0,
  padding: 0,
}

export const container = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '32px 24px 40px',
}

export const header = {
  padding: '0 0 24px',
  borderBottom: '1px solid #F1F5F9',
  marginBottom: '32px',
}

export const brandRow = {
  display: 'flex' as const,
  alignItems: 'center' as const,
  gap: '10px',
}

export const brandMark = {
  display: 'inline-block' as const,
  backgroundColor: '#F97316', // primary
  color: '#ffffff',
  fontWeight: 700 as const,
  fontSize: '18px',
  lineHeight: '36px',
  width: '36px',
  height: '36px',
  textAlign: 'center' as const,
  borderRadius: '10px',
  marginRight: '10px',
  verticalAlign: 'middle' as const,
}

export const brandName = {
  fontSize: '18px',
  fontWeight: 700 as const,
  color: '#0F172A',
  verticalAlign: 'middle' as const,
}

export const h1 = {
  fontSize: '24px',
  fontWeight: 700 as const,
  color: '#0F172A', // foreground
  margin: '0 0 20px',
  lineHeight: '1.3',
}

export const text = {
  fontSize: '15px',
  color: '#334155',
  lineHeight: '1.6',
  margin: '0 0 18px',
}

export const link = {
  color: '#F97316',
  textDecoration: 'underline' as const,
}

export const buttonWrap = {
  textAlign: 'center' as const,
  margin: '28px 0',
}

export const button = {
  backgroundColor: '#F97316', // primary
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 600 as const,
  borderRadius: '10px', // matches --radius 0.625rem
  padding: '14px 28px',
  textDecoration: 'none' as const,
  display: 'inline-block' as const,
}

export const codeStyle = {
  display: 'inline-block' as const,
  fontFamily: 'SFMono-Regular, Menlo, Consolas, monospace',
  fontSize: '28px',
  letterSpacing: '6px',
  fontWeight: 700 as const,
  color: '#0F172A',
  backgroundColor: '#FFF7ED', // primary/10 tint
  border: '1px solid #FED7AA',
  borderRadius: '10px',
  padding: '14px 24px',
  margin: '8px 0 28px',
}

export const muted = {
  fontSize: '13px',
  color: '#64748B',
  lineHeight: '1.6',
  margin: '24px 0 0',
}

export const footer = {
  fontSize: '12px',
  color: '#94A3B8',
  lineHeight: '1.6',
  margin: '32px 0 0',
  paddingTop: '20px',
  borderTop: '1px solid #F1F5F9',
}
