import { readLinkedInIdentity, applyLinkedInIdentity } from '@/lib/linkedinIdentity.functions'
import type { OidcConsent, OidcSuggestion } from './linkedin-oidc'

export interface IdentityProfile { name: string | null; email: string | null; avatar_url: string | null }
export interface LinkedInIdentityDraft { userId: string; suggestion: OidcSuggestion; current: IdentityProfile }
export interface IdentityReceipt { userId: string; name: string | null; email: string | null; avatarUrl: string | null; changed: Array<keyof IdentityProfile> }

export const loadLinkedInIdentityDraft = (): Promise<LinkedInIdentityDraft | null> => readLinkedInIdentity()
export const saveLinkedInIdentityDraft = (draft: LinkedInIdentityDraft, consent: OidcConsent): Promise<IdentityReceipt> => applyLinkedInIdentity({data:{draft,consent}})
