# Componentes de interface

Componentes básicos da Viuê. Todos aceitam `className` para ajustes locais, mas as variantes devem ser priorizadas para manter consistência.

```tsx
import { Mail } from 'lucide-react';

import { Badge, Button, ConfirmDialog, Input, Modal, Tabs } from '@/components/ui';

<Input
  description="Usaremos este endereço para confirmar sua conta."
  label="E-mail"
  leftElement={<Mail aria-hidden="true" size={18} />}
  name="email"
  required
  type="email"
/>

<Button isLoading={false} rightIcon={<Mail aria-hidden="true" size={18} />}>
  Continuar
</Button>

<Badge variant="info">Em breve</Badge>

// Modal base (composition pattern): monte modais próprios a partir de Modal.Root.
<Modal.Root open={isOpen} onOpenChange={setIsOpen}>
  <Modal.Header>
    <Modal.Title>Título do modal</Modal.Title>
    <Modal.CloseButton />
  </Modal.Header>
  <Modal.Body>
    <Modal.Description>Conteúdo do modal.</Modal.Description>
  </Modal.Body>
  <Modal.Footer>
    <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
    <Button onClick={handleConfirm}>Confirmar</Button>
  </Modal.Footer>
</Modal.Root>

// ConfirmDialog: modal de "tem certeza?" pronto, construído sobre o Modal base.
<ConfirmDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  title="Excluir item?"
  description="Essa ação não pode ser desfeita."
  confirmLabel="Excluir"
  confirmVariant="danger"
  onConfirm={handleDelete}
/>

<Tabs
  ariaLabel="Acesso à conta"
  defaultValue="login"
  items={[
    { label: 'Entrar', value: 'login' },
    { label: 'Criar conta', value: 'register' },
  ]}
/>
```

## Acessibilidade

- Use `label` em todo `Input`; o componente relaciona label, descrição e erro automaticamente.
- Elementos decorativos em `leftElement`, `rightElement`, `icon`, `leftIcon` ou `rightIcon` devem receber `aria-hidden="true"`.
- Botões apenas com ícone precisam de `aria-label`.
- `Tabs` suporta setas, `Home` e `End`; forneça sempre um `ariaLabel` descritivo.
- Não use apenas cor para comunicar estado. Badge, erro e loading devem manter texto acessível.
- `Modal.Root` já cuida de foco, `Escape`, clique fora e bloqueio de scroll. Em desktop (≥1024px) ele centraliza em tamanho fixo; em mobile/tablet vira uma folha (bottom sheet) que desliza de baixo.
