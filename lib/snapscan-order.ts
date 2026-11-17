/** Only merchant-created UUID references are accepted for payment recovery. */
const orderReferencePattern = /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;

type OrderSources = {
  checkout?: string | null;
  returned?: string | null;
  stored?: string | null;
};

/**
 * A newly created checkout always replaces the previous browser order.
 * On a fresh page load, the SnapScan return URL beats stale local storage.
 */
export function selectSnapscanOrder({ checkout, returned, stored }: OrderSources) {
  for (const candidate of [checkout, returned, stored]) {
    const reference = (candidate || '').trim().toLowerCase();
    if (orderReferencePattern.test(reference)) return reference;
  }
  return '';
}
