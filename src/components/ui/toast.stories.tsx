import type { Meta, StoryObj } from '@storybook/nextjs';

import { useToast } from '@/hooks/use-toast';

import { Button } from './button';
import { ToastViewport } from './toast';

function ToastDemo() {
  const showToast = useToast();

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() =>
            showToast({
              description: 'As novidades da sua comunidade já estão disponíveis.',
              title: 'Tudo certo',
              variant: 'success',
            })
          }
        >
          Sucesso
        </Button>
        <Button
          onClick={() =>
            showToast({
              description: 'Você precisa concluir a validação do seu e-mail.',
              title: 'Validação pendente',
              variant: 'warning',
            })
          }
          variant="outline"
        >
          Aviso
        </Button>
        <Button
          onClick={() =>
            showToast({
              description: 'Confira os dados informados e tente novamente.',
              title: 'Não foi possível continuar',
              variant: 'error',
            })
          }
          variant="danger"
        >
          Erro
        </Button>
      </div>
      <ToastViewport />
    </>
  );
}

const meta = {
  title: 'Design System/Toast',
  component: ToastViewport,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Notificação global controlada por Zustand. O viewport é montado uma única vez no layout.',
      },
    },
  },
} satisfies Meta<typeof ToastViewport>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: () => <ToastDemo />,
};
