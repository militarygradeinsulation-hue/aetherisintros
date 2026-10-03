import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/invite/$code')({
  head: () => ({
    meta: [
      { title: 'You are invited — Ask Intros' },
      { name: 'description', content: 'A member invited you to Ask Intros. Create your account and you join each other’s network.' },
      { property: 'og:title', content: 'You are invited to Ask Intros' },
      { property: 'og:description', content: 'Create your account with this invite and you join each other’s network.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/auth', search: { invite: params.code } })
  },
})
