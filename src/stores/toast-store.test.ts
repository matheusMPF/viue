import { beforeEach, describe, expect, it } from 'vitest';

import { useToastStore } from './toast-store';

describe('toast store', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it('adds and dismisses a toast', () => {
    const id = useToastStore.getState().showToast({ title: 'Teste', variant: 'success' });

    expect(useToastStore.getState().toasts).toEqual([
      expect.objectContaining({ id, title: 'Teste', variant: 'success' }),
    ]);

    useToastStore.getState().dismissToast(id);
    expect(useToastStore.getState().toasts).toEqual([]);
  });

  it('keeps at most four visible messages', () => {
    for (let index = 1; index <= 5; index += 1) {
      useToastStore.getState().showToast({ title: `Toast ${index}` });
    }

    expect(useToastStore.getState().toasts.map((toast) => toast.title)).toEqual([
      'Toast 2',
      'Toast 3',
      'Toast 4',
      'Toast 5',
    ]);
  });
});
