import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    {
      type: 'category',
      label: 'Getting Started',
      items: ['getting-started', 'define-connection', 'define-models', 'create-records', 'query'],
    },
    {
      type: 'category',
      label: 'Advanced',
      items: ['aggregation', 'constraint', 'association', 'callback', 'geospatial', 'miscellaneous', 'validation'],
    },
  ],
};

export default sidebars;
