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
  docsRepositoryBase:
    'https://github.com/heurist-network/heurist-sdk/blob/main',
    footer: {
      text: 'Heurist SDK Docs',
      // component: () => (
      //   <div className="nextra-theme-docs-footer bg-gray-100 text-gray-600 py-6 text-md">
      //     <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      //       <div className="flex items-center justify-center">
      //           Heurist SDK Docs
      //       </div>
      //     </div>
      //   </div>
      // ),
    }
}

export default config
