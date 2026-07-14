export type ResourceLedger = {
  scrap: number;
  ore: number;
  essence: number;
};

export function createEmptyResourceLedger(): ResourceLedger {
  return {
    scrap: 0,
    ore: 0,
    essence: 0,
  };
}

export function getResourceLedgerTotal(ledger: ResourceLedger) {
  return ledger.scrap + ledger.ore + ledger.essence;
}
