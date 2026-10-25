import { z } from 'zod'

export const entitlementSchema = z.object({
  level: z.enum(['basic', 'linkedin_verified', 'paid', 'legacy']),
  networking: z.boolean(),
  business: z.boolean(),
  blackCard: z.boolean(),
  linkedinVerified: z.boolean(),
}).superRefine((e, context) => {
  if ((e.level === 'basic' && (e.networking || e.business || e.blackCard)) ||
      (e.level === 'linkedin_verified' && (!e.linkedinVerified || !e.networking || e.business || e.blackCard)) ||
      (e.level === 'paid' && (!e.networking || !e.business || !e.blackCard)) ||
      (e.blackCard && e.level !== 'paid')) {
    context.addIssue({ code: 'custom', message: 'Inconsistent membership permissions' })
  }
})
export type MemberEntitlements = z.infer<typeof entitlementSchema>
export const basicEntitlements: MemberEntitlements = {
  level: 'basic', networking: false, business: false, blackCard: false, linkedinVerified: false,
}

/** Reject malformed permission responses rather than estimating membership locally. */
export function parseEntitlements(value: unknown): MemberEntitlements {
  return entitlementSchema.parse(value)
}

export function membershipPageRequirement(page: string, tool?: string): 'networking' | 'business' | null {
  if (['home', 'people', 'profile', 'news', 'bubbles'].includes(page)) return null
  if (page === 'workspace' && ['profile', 'preferences', 'membership', 'membership-upgrade'].includes(tool ?? '')) return null
  if (['intros', 'messages'].includes(page)) return 'networking'
  return 'business'
}