import { describe, expect, it } from 'vitest';

import { formatBirthDateForDisplay, maskBirthDateInput, parseBirthDateInput } from './birth-date';

describe('maskBirthDateInput', () => {
  it('insere as barras conforme os dígitos são digitados', () => {
    expect(maskBirthDateInput('0')).toBe('0');
    expect(maskBirthDateInput('03')).toBe('03');
    expect(maskBirthDateInput('030')).toBe('03/0');
    expect(maskBirthDateInput('03092026')).toBe('03/09/2026');
  });

  it('ignora caracteres não numéricos e limita a 8 dígitos', () => {
    expect(maskBirthDateInput('03/09/2026extra')).toBe('03/09/2026');
  });
});

describe('parseBirthDateInput', () => {
  it('aceita uma data completa e válida', () => {
    expect(parseBirthDateInput('03/09/2020')).toBe('2020-09-03');
  });

  it('rejeita datas incompletas', () => {
    expect(parseBirthDateInput('03/09/202')).toBe(null);
    expect(parseBirthDateInput('')).toBe(null);
  });

  it('rejeita datas inexistentes no calendário', () => {
    expect(parseBirthDateInput('31/02/2020')).toBe(null);
    expect(parseBirthDateInput('00/01/2020')).toBe(null);
  });

  it('rejeita datas no futuro ou anteriores a 1900', () => {
    expect(parseBirthDateInput('01/01/1800')).toBe(null);
    expect(parseBirthDateInput('01/01/2099')).toBe(null);
  });
});

describe('formatBirthDateForDisplay', () => {
  it('converte ISO para DD/MM/AAAA', () => {
    expect(formatBirthDateForDisplay('2020-09-03')).toBe('03/09/2020');
  });

  it('retorna string vazia para valores ausentes ou inválidos', () => {
    expect(formatBirthDateForDisplay(null)).toBe('');
    expect(formatBirthDateForDisplay(undefined)).toBe('');
    expect(formatBirthDateForDisplay('not-a-date')).toBe('');
  });
});
