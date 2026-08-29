# Componentes de interface

Componentes básicos da Viuê. Todos aceitam `className` para ajustes locais, mas as variantes devem ser priorizadas para manter consistência.

```tsx
import { Mail } from 'lucide-react';

import { Badge, Button, Input, Tabs } from '@/components/ui';

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
