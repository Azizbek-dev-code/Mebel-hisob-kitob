import { WorkerCompensationType, WorkerResponsibility } from '@furniture-erp/shared';
import { describe, expect, it } from 'vitest';

import {
  basisPointsToPercentInput,
  compensationTypesForResponsibility,
  formatCompensationPercent,
  formatCompensationRuleValue,
  isValidCompensationPercentInput,
  percentInputToBasisPoints,
  toCompensationDateInputValue,
} from './compensation-labels';

describe('compensation percent conversion', () => {
  it('formats basis points as percent without floating money math', () => {
    expect(basisPointsToPercentInput(1000)).toBe('10');
    expect(basisPointsToPercentInput(250)).toBe('2.5');
    expect(basisPointsToPercentInput(125)).toBe('1.25');
    expect(formatCompensationPercent(1000)).toBe('10%');
    expect(formatCompensationPercent(250)).toBe('2.5%');
  });

  it('parses percent input to basis points', () => {
    expect(percentInputToBasisPoints('10')).toBe(1000);
    expect(percentInputToBasisPoints('2.5')).toBe(250);
    expect(percentInputToBasisPoints('1.25')).toBe(125);
    expect(percentInputToBasisPoints('100')).toBe(10_000);
  });

  it('rejects invalid percent inputs', () => {
    expect(isValidCompensationPercentInput('0')).toBe(false);
    expect(isValidCompensationPercentInput('-1')).toBe(false);
    expect(isValidCompensationPercentInput('100.01')).toBe(false);
    expect(isValidCompensationPercentInput('abc')).toBe(false);
    expect(isValidCompensationPercentInput('1.234')).toBe(false);
    expect(isValidCompensationPercentInput('10')).toBe(true);
    expect(isValidCompensationPercentInput('2.5')).toBe(true);
  });
});

describe('formatCompensationRuleValue', () => {
  it('formats percent and fixed values for display', () => {
    expect(
      formatCompensationRuleValue({
        type: WorkerCompensationType.PERCENT_OF_SALE,
        value: 1000,
      }),
    ).toBe('10%');

    expect(
      formatCompensationRuleValue({
        type: WorkerCompensationType.FIXED_PER_ASSEMBLY,
        value: 150_000,
      }),
    ).toMatch(/150[\s\u00A0]*000/);
  });
});

describe('compensationTypesForResponsibility', () => {
  it('offers seller types and not assembly types', () => {
    expect(compensationTypesForResponsibility(WorkerResponsibility.SELLER)).toEqual([
      WorkerCompensationType.PERCENT_OF_SALE,
      WorkerCompensationType.PERCENT_OF_GROSS_PROFIT,
      WorkerCompensationType.FIXED_PER_SALE,
    ]);
    expect(compensationTypesForResponsibility(WorkerResponsibility.ASSEMBLER)).toEqual([
      WorkerCompensationType.FIXED_PER_ASSEMBLY,
    ]);
    expect(compensationTypesForResponsibility(WorkerResponsibility.SMM)).toEqual([]);
  });
});

describe('toCompensationDateInputValue', () => {
  it('extracts YYYY-MM-DD from ISO timestamps', () => {
    expect(toCompensationDateInputValue('2026-01-01T12:00:00.000Z')).toBe('2026-01-01');
    expect(toCompensationDateInputValue(null)).toBe('');
  });
});
