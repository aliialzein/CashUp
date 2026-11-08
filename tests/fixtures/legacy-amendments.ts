// Read-only fixture inventory of columns removed by the applied money-pairs migration.
// No field is assigned a guessed currency; old values remain readable verbatim.
export const legacyAmendmentFixtures = [
    'businessAmount', 'deliveryFee', 'tip', 'discount', 'totalCollected',
    'changeGiven', 'currency', 'changeCurrency', 'mixedChange',
].map(field => ({ kind: 'SALE_FIELD' as const, field, oldValue: field.includes('Currency') || field === 'currency' ? 'USD' : field === 'mixedChange' ? 'false' : '10.00', newValue: field.includes('Currency') || field === 'currency' ? 'LBP' : field === 'mixedChange' ? 'true' : '15.00' }));
