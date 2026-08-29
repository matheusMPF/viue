import type { Preview } from '@storybook/nextjs';
import { Bricolage_Grotesque, Manrope } from 'next/font/google';

import '../src/app/globals.css';

const bricolageGrotesque = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin'],
});

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
});

const preview: Preview = {
  decorators: [
    (Story, context) => (
      <div
        className={`${bricolageGrotesque.variable} ${manrope.variable} ${context.globals.theme === 'light' ? 'light' : ''} min-h-40 min-w-80 bg-background p-6 font-sans text-foreground antialiased`}
      >
        <Story />
      </div>
    ),
  ],
  globalTypes: {
    theme: {
      description: 'Tema dos componentes',
      toolbar: {
        dynamicTitle: true,
        icon: 'paintbrush',
        items: [
          { title: 'Escuro', value: 'dark' },
          { title: 'Claro', value: 'light' },
        ],
      },
    },
  },
  initialGlobals: {
    theme: 'dark',
  },
  parameters: {
    a11y: {
      test: 'error',
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'centered',
    options: {
      storySort: {
        order: ['Design System', ['Button', 'Input', 'Label', 'Badge', 'Tabs']],
      },
    },
  },
};

export default preview;
