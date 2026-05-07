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

export const TEMPLATES: Record<string, TemplateEntry> = {
  'trial-ending': trialEnding,
  'provision-request-received': provisionRequestReceived,
  'provision-live': provisionLive,
  'customer-password-reset': customerPasswordReset,
}
