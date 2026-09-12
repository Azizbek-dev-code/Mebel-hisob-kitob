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
  manualFeeTotal: 0,
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

    expect(screen.getAllByText('Usta haqqi').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/300 000/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bekor qilingan').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ish bajarilgan').length).toBeGreaterThan(0);
  });

  it('does not flag fees whose source document is still active', () => {
    renderPanel({
      ...USTA_FEE_ON_CANCELLED_SALE,
      items: [{ ...USTA_FEE_ON_CANCELLED_SALE.items[0]!, sourceCancelled: false }],
    });

    expect(screen.queryByText('Bekor qilingan')).not.toBeInTheDocument();
    expect(screen.queryByText('Ish bajarilgan')).not.toBeInTheDocument();
  });

  it('renders a manual COMMISSION without a sale or purchase link', () => {
    renderPanel({
      sellerBonusTotal: 0,
      assemblerFeeTotal: 0,
      installerFeeTotal: 0,
      deliveryFeeTotal: 0,
      purchaseDriverFeeTotal: 0,
      manualFeeTotal: 200_000,
      grandTotal: 200_000,
      items: [
        {
          id: 'tx_manual',
          kind: 'MANUAL_COMMISSION',
          source: 'MANUAL',
          amount: 200_000,
          occurredAt: '2026-09-12T10:00:00.000Z',
          referenceId: 'tx_manual',
          referenceLabel: "Qo'lda",
          description: 'Admin qo‘lda komissiya',
          sourceCancelled: false,
          workCompleted: true,
        },
      ],
    });

    expect(screen.getAllByText(/Qo['‘]lda komissiya/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Qo'lda").length).toBeGreaterThan(0);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
