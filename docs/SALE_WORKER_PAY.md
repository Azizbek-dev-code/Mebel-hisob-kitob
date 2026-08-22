# Sale worker pay & service fees

## Simple usta / shopir fees (preferred create UI)

On create/detail, enter two optional sale-level amounts:

| UI label | API (preferred) | Persisted column | Feeds |
|----------|-----------------|------------------|-------|
| Usta haqqi | `assemblerFee` | `Sale.installationCost` | `calculateSaleTotals` → `netProfit` |
| Shopir haqqi | `driverFee` | `Sale.deliveryCost` | same |

Legacy request fields `installationCost` / `deliveryCost` still work; when both alias and legacy are sent, the alias wins.

**Seller % commission** stays on `WorkerCompensationRule` (PERCENT_OF_SALE / PERCENT_OF_GROSS_PROFIT / FIXED_PER_SALE). Do **not** write that estimate into `sellerBonus`. Detail shows a read-only estimate only.

Do **not** also submit MANUAL `SaleWorkerCompensation` rows for ASSEMBLER/SHOPIR for the same amounts — that would double-count with compensation settle.

## MANUAL Ish haqlari (advanced / legacy)

Admins may still store exact UZS amounts for four roles on a sale:

| Role | Enum | Required responsibility |
|------|------|-------------------------|
| Sotuvchi | `SELLER` | `SELLER` |
| Usta | `ASSEMBLER` | `ASSEMBLER` |
| Dastafchi | `DASTAFCHI` | `DELIVERY` |
| Shopir | `SHOPIR` | `DELIVERY` |

Rows are stored in `SaleWorkerCompensation` with `source = MANUAL`. The simple create form does not send these.

## MANUAL vs RULE

- The existing `WorkerCompensationRule` engine is unchanged.
- For a given sale event bucket, a MANUAL row **overrides** RULE lines:
  - `SELLER` → drops RULE `SALE` lines for that sale
  - `ASSEMBLER` → drops RULE `ASSEMBLY` lines whose assembly belongs to that sale
  - `DASTAFCHI` or `SHOPIR` → drops RULE `DELIVERY` lines for that sale
- Preview/settle append MANUAL lines with stable id `${saleId}:MANUAL:${role}`.
- Cancelled sales are excluded from preview (repository filter on `sale.status`).

## P&L semantics

- Stored `netProfit` = `grossProfit − sellerBonus − installationCost − deliveryCost − otherCosts` (usta/shopir via installation/delivery).
- Display “Sotuvdan qolgan foyda” may use: `grossProfit − sellerCommissionEstimate − assemblerFee − driverFee` (estimate only; note if sellerBonus/otherCosts also apply).
- Manual Ish haqlari feed compensation preview/settle only — not period `netProfit`.
- Period P&L continues to use settled `COMMISSION` rows; do **not** also subtract manuals into period netProfit (avoid double counting).

## Permissions

- Create: whoever may create sales may set usta/shopir fees on create.
- Update: only `ADMIN` / `PLATFORM_ADMIN` may patch `installationCost` / `deliveryCost` / `assemblerFee` / `driverFee` (and sellerBonus/otherCosts). Employees get 403.

## Locking

After a MANUAL line is settled as a `COMMISSION` with `referenceType = COMPENSATION` and `referenceId` starting with `${saleId}:MANUAL:`, updating `workerCompensation` on that sale returns **409**.
