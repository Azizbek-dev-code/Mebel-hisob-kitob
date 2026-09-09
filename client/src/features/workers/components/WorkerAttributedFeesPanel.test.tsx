import type { WorkerAttributedFeesSummary } from '@furniture-erp/shared';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { WorkerAttributedFeesPanel } from '@/features/workers/components/WorkerAttributedFeesPanel';
import { renderWithProviders, screen } from '@/test/test-utils';

const USTA_FEE_ON_CANCELLED_SALE: WorkerAttributedFeesSummary = {
  sellerBonusTotal: 0,
  assemblerFeeTotal: 300_000,
  installerFeeTotal: 0,
  deliveryFeeTotal: 0,
  purchaseDriverFeeTotal: 0,
  grandTotal: 300_000,
  items: [
    {
      id: 'tx_usta',
      kind: 'ASSEMBLER_FEE',
      source: 'SALE',
      amount: 300_000,
      occurredAt: '2026-09-01T10:00:00.000Z',
      referenceId: 'sale_8',
      referenceLabel: 'Sotuv #8',
      description: 'Usta haqqi · Sotuv #8',
      sourceCancelled: true,
      workCompleted: true,
    },
  ],
};

function renderPanel(fees: WorkerAttributedFeesSummary) {
  return renderWithProviders(
    <MemoryRouter>
      <WorkerAttributedFeesPanel fees={fees} isLoading={false} />
    </MemoryRouter>,
  );
}

describe('WorkerAttributedFeesPanel', () => {
  it('keeps the earning visible and flags the cancelled source as completed work', () => {
    renderPanel(USTA_FEE_ON_CANCELLED_SALE);

    expect(screen.getByText('Usta haqqi')).toBeInTheDocument();
    expect(screen.getAllByText(/300 000/).length).toBeGreaterThan(0);
    expect(screen.getByText('Bekor qilingan')).toBeInTheDocument();
    expect(screen.getByText('Ish bajarilgan')).toBeInTheDocument();
  });

  it('does not flag fees whose source document is still active', () => {
    renderPanel({
      ...USTA_FEE_ON_CANCELLED_SALE,
      items: [{ ...USTA_FEE_ON_CANCELLED_SALE.items[0]!, sourceCancelled: false }],
    });

    expect(screen.queryByText('Bekor qilingan')).not.toBeInTheDocument();
    expect(screen.queryByText('Ish bajarilgan')).not.toBeInTheDocument();
  });
});
