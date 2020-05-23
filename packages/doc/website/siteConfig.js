const siteConfig = {
  title: 'CORMO',
  tagline: 'ORM framework for Node.js',
  url: 'https://croquiscom.github.io',
  baseUrl: '/cormo/',
  projectName: 'cormo',
  headerLinks: [
    { doc: 'getting-started', label: 'Docs' },
    { href: '/cormo/api/cormo', label: 'API' },
  ],
  colors: {
    primaryColor: '#b04176',
    secondaryColor: '#7b2e53',
  },
  copyright: 'Copyright © 2012-2020 Croquis inc.',
  highlight: {
    theme: 'default',
  },
  scripts: ['https://buttons.github.io/buttons.js'],
  onPageNav: 'separate',
  cleanUrl: true,
};

module.exports = siteConfig;
