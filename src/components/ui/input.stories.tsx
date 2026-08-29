import type { Meta, StoryObj } from '@storybook/nextjs';
import { Eye, LockKeyhole, Mail, Search } from 'lucide-react';

import { Button } from './button';
import { Input } from './input';

const meta = {
  title: 'Design System/Input',
  component: Input,
  tags: ['autodocs'],
  args: {
    label: 'E-mail',
    name: 'email',
    placeholder: 'voce@exemplo.com',
    type: 'email',
  },
  argTypes: {
    leftElement: { control: false },
    rightElement: { control: false },
    error: { control: 'text' },
    description: { control: 'text' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Campo com label associada, adornos opcionais, descrição, erro e suporte nativo a atributos de formulário.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[min(420px,80vw)]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Required: Story = {
  args: {
    required: true,
  },
};

export const WithElements: Story = {
  args: {
    label: 'Buscar conteúdo',
    leftElement: <Search aria-hidden="true" size={18} />,
    placeholder: 'Filme, série, game ou livro',
    rightElement: (
      <Button aria-label="Executar busca" className="-mr-2 h-9 w-9" size="icon" variant="ghost">
        <Search aria-hidden="true" size={17} />
      </Button>
    ),
    type: 'search',
  },
};

export const Password: Story = {
  args: {
    label: 'Senha',
    leftElement: <LockKeyhole aria-hidden="true" size={18} />,
    placeholder: 'Digite sua senha',
    rightElement: (
      <Button aria-label="Mostrar senha" className="-mr-2 h-9 w-9" size="icon" variant="ghost">
        <Eye aria-hidden="true" size={17} />
      </Button>
    ),
    type: 'password',
  },
};

export const WithDescription: Story = {
  args: {
    description: 'Usaremos este endereço para confirmar sua conta.',
    required: true,
  },
};

export const WithError: Story = {
  args: {
    defaultValue: 'email-invalido',
    error: 'Informe um endereço de e-mail válido.',
    required: true,
  },
};

export const Disabled: Story = {
  args: {
    defaultValue: 'contato@viue.com.br',
    disabled: true,
    leftElement: <Mail aria-hidden="true" size={18} />,
  },
};
