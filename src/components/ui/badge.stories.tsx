import type { Meta, StoryObj } from '@storybook/nextjs';
import { Check, Clock3, Sparkles } from 'lucide-react';

import { Badge, type BadgeVariant } from './badge';

const variants: BadgeVariant[] = ['neutral', 'primary', 'info', 'success', 'warning', 'danger'];

const meta = {
  title: 'Design System/Badge',
  component: Badge,
  tags: ['autodocs'],
  args: {
    children: 'Em breve',
    variant: 'info',
  },
  argTypes: {
    variant: { control: 'select', options: variants },
    icon: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component: 'Identificador compacto para categorias, estados e informações contextuais.',
      },
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      {variants.map((variant) => (
        <Badge key={variant} variant={variant}>
          {variant}
        </Badge>
      ))}
    </div>
  ),
};

export const WithIcon: Story = {
  args: {
    children: 'Conta confirmada',
    icon: <Check aria-hidden="true" size={14} />,
    variant: 'success',
  },
};

export const ProductStates: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Badge icon={<Sparkles aria-hidden="true" size={14} />} variant="primary">
        Lançamento
      </Badge>
      <Badge icon={<Clock3 aria-hidden="true" size={14} />} variant="info">
        Em breve
      </Badge>
    </div>
  ),
};
