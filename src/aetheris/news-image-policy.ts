export const IMAGE_HOSTS = [
  'aetheris.technology', 'techcrunch.com', 'theverge.com', 'vox-cdn.com',
  'entrepreneur.com', 'inc.com', 'fastcompany.com', 'fortune.com', 'forbes.com',
  'cnbcfm.com', 'reuters.com', 'reutersconnect.com', 'bbci.co.uk', 'bbc.com',
  'wsj.net', 'ft.com', 'ftcdn.net', 'nytimes.com', 'nyt.com', 'bloomberg.com',
]
export function isPublisherImageHost(hostname: string): boolean {
  return IMAGE_HOSTS.some(host => hostname === host || hostname.endsWith(`.${host}`))
}
