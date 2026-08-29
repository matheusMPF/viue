import type { Meta, StoryObj } from '@storybook/nextjs';

import { Label } from './label';

const meta = {
  title: 'Design System/Label',
  component: Label,
  tags: ['autodocs'],
  args: {
    children: 'Nome do perfil',
    htmlFor: 'storybook-label-example',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Rótulo de formulário com indicação visual e textual para campos obrigatórios ou opcionais.',
      },
    },
  },
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Required: Story = {
  args: {
    required: true,
  },
};

export const Optional: Story = {
  args: {
    optional: true,
  },
};
