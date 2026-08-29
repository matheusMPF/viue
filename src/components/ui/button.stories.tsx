import type { Meta, StoryObj } from '@storybook/nextjs';
import { ArrowRight, Check, Plus, Search } from 'lucide-react';

import { Button, type ButtonVariant } from './button';

const variants: ButtonVariant[] = ['primary', 'secondary', 'outline', 'ghost', 'danger'];

const meta = {
  title: 'Design System/Button',
  component: Button,
  tags: ['autodocs'],
  args: {
    children: 'Continuar',
    size: 'md',
    variant: 'primary',
  },
  argTypes: {
    variant: { control: 'select', options: variants },
    size: { control: 'select', options: ['sm', 'md', 'lg', 'icon'] },
    leftIcon: { control: false },
    rightIcon: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component: 'Botão base da Viuê com variantes, tamanhos, ícones e estado de carregamento.',
      },
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      {variants.map((variant) => (
        <Button {...args} key={variant} variant={variant}>
          {variant}
        </Button>
      ))}
    </div>
  ),
};

export const WithIcons: Story = {
  args: {
    leftIcon: <Plus aria-hidden="true" size={18} />,
    rightIcon: <ArrowRight aria-hidden="true" size={18} />,
    children: 'Criar lista',
  },
};

export const Loading: Story = {
  args: {
    children: 'Salvando',
    isLoading: true,
  },
};

export const IconOnly: Story = {
  args: {
    'aria-label': 'Pesquisar',
    children: <Search aria-hidden="true" size={18} />,
    size: 'icon',
    variant: 'outline',
  },
};

export const Disabled: Story = {
  args: {
    children: 'Concluído',
    disabled: true,
    leftIcon: <Check aria-hidden="true" size={18} />,
  },
};
