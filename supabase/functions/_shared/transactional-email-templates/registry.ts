/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as trialEnding } from './trial-ending.tsx'
import { template as provisionRequestReceived } from './provision-request-received.tsx'
import { template as provisionLive } from './provision-live.tsx'
import { template as customerPasswordReset } from './customer-password-reset.tsx'
import { template as lowBalance } from './low-balance.tsx'
import { template as welcomeCustomer } from './welcome-customer.tsx'
import { template as partnerInvite } from './partner-invite.tsx'
import { template as clientStoreInvite } from './client-store-invite.tsx'
import { template as annualRenewal } from './annual-renewal.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'trial-ending': trialEnding,
  'provision-request-received': provisionRequestReceived,
  'provision-live': provisionLive,
  'customer-password-reset': customerPasswordReset,
  'low-balance': lowBalance,
  'welcome-customer': welcomeCustomer,
  'partner-invite': partnerInvite,
  'client-store-invite': clientStoreInvite,
  'annual-renewal': annualRenewal,
}
