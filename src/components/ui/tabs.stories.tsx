import type { Meta, StoryObj } from '@storybook/nextjs';
import { Film, Gamepad2, LogIn, UserPlus } from 'lucide-react';

import { Tabs } from './tabs';

const authItems = [
  {
    content: <p className="text-sm text-muted-foreground">Formulário de acesso selecionado.</p>,
    icon: <LogIn aria-hidden="true" size={16} />,
    label: 'Entrar',
    value: 'login',
  },
  {
    content: <p className="text-sm text-muted-foreground">Formulário de cadastro selecionado.</p>,
    icon: <UserPlus aria-hidden="true" size={16} />,
    label: 'Criar conta',
    value: 'register',
  },
] as const;

const meta = {
  title: 'Design System/Tabs',
  component: Tabs,
  tags: ['autodocs'],
  args: {
    ariaLabel: 'Acesso à conta',
    defaultValue: 'login',
    items: authItems,
    variant: 'segment',
  },
  argTypes: {
    items: { control: false },
    onValueChange: { control: false },
    variant: { control: 'select', options: ['segment', 'underline'] },
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
  },
  decorators: [
    (Story) => (
      <div className="w-[min(520px,80vw)]">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Alternância acessível entre vistas, com suporte a estado controlado, painéis, orientação e navegação por teclado.',
      },
    },
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Segment: Story = {};

export const Underline: Story = {
  args: {
    variant: 'underline',
  },
};

export const WithDisabledItem: Story = {
  args: {
    ariaLabel: 'Categorias de entretenimento',
    defaultValue: 'movies',
    items: [
      {
        content: <p className="text-sm text-muted-foreground">Filmes disponíveis no MVP.</p>,
        icon: <Film aria-hidden="true" size={16} />,
        label: 'Filmes',
        value: 'movies',
      },
      {
        disabled: true,
        icon: <Gamepad2 aria-hidden="true" size={16} />,
        label: 'Games',
        value: 'games',
      },
    ],
  },
};

export const Vertical: Story = {
  args: {
    orientation: 'vertical',
  },
};
