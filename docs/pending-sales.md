# Pending sales and delivery completion

`createSale` and `confirmSaleDelivery` retain the existing service/repository and
cash-up locking boundaries. Payment values are decimal strings, at most two
fractional digits, and keep the existing currency maxima.

- `TO_DELIVER`: order business amounts, initial delivery fees, discounts, client
  number and note are stored. The client number is required. Method, collected
  USD/LBP, change USD/LBP and tip USD/LBP are null. Omission or explicit null is
  accepted for those fields; any actual value (including zero or CASH) is rejected
  with `PAYMENT_NOT_ALLOWED_FOR_PENDING_SALE`. No payment balance is required.
- Direct `DELIVERED`: method and all six payment amounts (collected, change and
  tip in each currency) are required. Send explicit zero for unused currency,
  no change and no tip. Existing order-money defaults and balance rules remain.
- Completion: method and all six payment amounts are required together. Final
  `deliveryFeeUsd` and `deliveryFeeLbp` are optional independently; omission retains
  that currency's initial fee, while explicit zero replaces it. The fee, tips,
  payment, discrepancy flag, DELIVERED status and deliveredAt are written within
  one transaction, together with the audit record.

`amountDiffers` compares collected minus change against business amount plus final
fee plus final tip minus discount. Equivalent currencies use the cash-up's saved
reference rate, with no implicit rounding. Cross-currency balancing still requires
that rate; real discrepancies are accepted and flagged. A null expected method
cannot cause a method-change warning. Drawer amounts remain separate movements
in each currency; pending orders do not contribute.

Pending edits accept only order fields; supplying actual payment values is
rejected. Delivered edits are rejected with `SALE_ALREADY_DELIVERED` after locking and
reading the current state. Existing ownership, closed-cash-up, deleted-sale and
deletion-lock checks retain precedence. Completion uses its separate atomic write.
DTOs and mappers preserve nulls, and the owner sales consumer shows Not collected.
The owner sales page currently uses mock data; this change does not add staff
forms or connect unrelated owner routing to the backend.

## Migration

`20261111000000_pending_sale_payment` makes the seven actual payment columns
nullable and removes monetary zero defaults. Database checks require pending
actual values and deliveredAt to be null, and delivered payment values to be
non-null. Existing non-negative checks remain. Deleted historical rows retain
values from either prior lifecycle. Delivered historical timestamps are not
invented or rewritten.

The previous service required a balanced payment plan and method even for pending
orders, but historical nonzero values cannot be proven to be only placeholders.
Before clearing pending actual fields, the migration archives every old value in
`legacyPendingPayment` (money and enum values as exact strings), including the old
deliveredAt and discrepancy flag. It keeps business amounts, initial fees,
discounts, client, note and edit history intact. Existing delivered and deleted
rows are unchanged apart from the new nullable archival column. The snapshot is
not exposed as actual payment by DTOs and is not used for completion warnings.

This migration has only been tested on the disposable test database. Apply it
through the normal deployment process before using this code with an app database.
