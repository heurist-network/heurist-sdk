import React from 'react'
import { DocsThemeConfig } from 'nextra-theme-docs'

const config: DocsThemeConfig = {
  logo: <span className="text-lg font-bold">Heurist SDK</span>,
  project: {
    link: 'https://github.com/heurist-network/heurist-sdk',
  },
  chat: {
    link: 'https://discord.com/invite/heuristai',
  },
  docsRepositoryBase: 'https://github.com/heurist-network/heurist-sdk',
  footer: {
    text: 'Heurist SDK Docs',
  },
}

export default config
