export type HeroDemoStat = { label: string; value: string }

export type HeroDemo = {
  host: string
  legalName: string
  category: string
  description: string
  source: { label: string; href: string }
  stats: readonly HeroDemoStat[]
  tags: readonly string[]
}

/** Rotating homepage placeholders — illustrative only. */
export const HERO_DEMOS: readonly HeroDemo[] = [
  {
    host: 'stripe.com',
    legalName: 'Stripe, Inc.',
    category: 'Financial services company',
    description:
      'Stripe, Inc. is an Irish-American multinational financial services and software as a service company dual-headquartered in South San Francisco, California, United States, and Dublin, Ireland.',
    source: { label: 'Wikipedia', href: 'https://en.wikipedia.org/wiki/Stripe,_Inc.' },
    stats: [
      { label: 'Valuation', value: '~$159B' },
      { label: 'Employees', value: '8,500+' },
      { label: 'Status', value: 'Private' },
    ],
    tags: ['Payments', 'B2B & platform', 'API-first', 'US$1.9tn volume (2025)', 'Dual HQ: US & EU'],
  },
  {
    host: 'notion.so',
    legalName: 'Notion Labs, Inc.',
    category: 'Productivity software',
    description:
      'Notion is an American productivity and note-taking software company. Its all-in-one workspace combines notes, docs, wikis, and project management for teams and individuals.',
    source: { label: 'Wikipedia', href: 'https://en.wikipedia.org/wiki/Notion_(software)' },
    stats: [
      { label: 'Valuation', value: '~$10B' },
      { label: 'Users', value: '30M+' },
      { label: 'HQ', value: 'San Francisco' },
    ],
    tags: ['Workspace', 'Docs & wikis', 'B2B + prosumer', 'Templates', 'API & integrations'],
  },
  {
    host: 'linear.app',
    legalName: 'Linear Orbit, Inc.',
    category: 'Issue tracking & roadmap',
    description:
      'Linear is a software company building a streamlined issue tracker and product management tool focused on speed, keyboard workflows, and engineering teams.',
    source: { label: 'Linear', href: 'https://linear.app' },
    stats: [
      { label: 'Focus', value: 'B2B SaaS' },
      { label: 'Stage', value: 'Growth' },
      { label: 'Category', value: 'Dev tools' },
    ],
    tags: ['Issue tracking', 'Roadmaps', 'Sprint planning', 'Git integrations', 'Keyboard-first'],
  },
  {
    host: 'vercel.com',
    legalName: 'Vercel Inc.',
    category: 'Cloud platform',
    description:
      'Vercel provides the developer platform for frontend frameworks, static sites, and serverless functions, known for tight integration with Next.js and edge delivery.',
    source: { label: 'Vercel', href: 'https://vercel.com' },
    stats: [
      { label: 'Funding', value: '$300M+' },
      { label: 'Focus', value: 'Frontend cloud' },
      { label: 'HQ', value: 'San Francisco' },
    ],
    tags: ['Edge network', 'Serverless', 'Next.js', 'Preview deploys', 'Observability'],
  },
  {
    host: 'figma.com',
    legalName: 'Figma, Inc.',
    category: 'Design & collaboration',
    description:
      'Figma is a collaborative interface design tool used for UI/UX design, prototyping, and design systems, with real-time multiplayer editing in the browser.',
    source: { label: 'Wikipedia', href: 'https://en.wikipedia.org/wiki/Figma' },
    stats: [
      { label: 'Acquisition', value: 'Adobe (pending)' },
      { label: 'Users', value: '4M+' },
      { label: 'HQ', value: 'San Francisco' },
    ],
    tags: ['Design systems', 'Prototyping', 'Dev Mode', 'Plugins', 'Real-time collab'],
  },
] as const

export const HERO_LOOP_MS = 4200

export function faviconUrlForHost(host: string) {
  const h = host.replace(/^https?:\/\//, '').split('/')[0] ?? host
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(h)}&sz=64`
}
