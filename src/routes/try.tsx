import { createFileRoute, redirect } from '@tanstack/react-router'

// Retired public questionnaire: existing links open the doors-first homepage.
export const Route = createFileRoute('/try')({
  beforeLoad: () => { throw redirect({ to: '/', replace: true }) },
})
