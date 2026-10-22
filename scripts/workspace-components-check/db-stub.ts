export const supabase = { rpc: async () => {
  if (window.location.hash === '#fail') return { data: null, error: { message: 'Analytics unavailable' } }
  if (window.location.hash === '#delay') await new Promise(resolve => setTimeout(resolve,300))
  return { data: { registered_accounts:12,confirmed_accounts:10,approved_members:8,pending_members:4,onboarded_profiles:6,introduction_requests:3,messages:21,posts:5,asks:2,generated_at:'2026-10-22T12:00:00Z' },error:null }
} }
