import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)
const pagesUrl = new URL(
  process.env.CI_PAGES_URL || 'http://localhost:3000/',
);
const config: Config = {
  title: 'XXX Project',
  tagline: 'XXX Project',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: pagesUrl.origin,
  baseUrl: pagesUrl.pathname.endsWith('/') ? pagesUrl.pathname : `${pagesUrl.pathname}/`,

  baseUrlIssueBanner: false,
  onBrokenLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          include: ['intro.mdx', 'meeting-minutes/**/*.{md,mdx}', 'requirements/**/*.{md,mdx}'],
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          routeBasePath: '/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],
  themes: [
    '@docusaurus/theme-mermaid'
  ],
  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'XXX Project',
      logo: {
        alt: 'XXX Project',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'meetingMinutesSidebar',
          position: 'left',
          label: 'Meeting Minutes',
        },
        {
          type: 'docSidebar',
          sidebarId: 'requirementsSidebar',
          position: 'left',
          label: 'Requirements',
        },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © ${new Date().getFullYear()} Pou Chen Group IT Department. All rights reserved.`,
    },
    mermaid: {
      theme: { light: "default", dark: "dark" },
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    }
  } satisfies Preset.ThemeConfig,
};

export default config;
