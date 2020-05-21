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
    primaryColor: '#aa5c9f',
    secondaryColor: '#76406f',
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
