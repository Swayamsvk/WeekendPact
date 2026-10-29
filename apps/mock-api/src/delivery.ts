import type { DeliveryOption } from './types.js';

export const FREE_STANDARD_DELIVERY_FROM_MINOR = 99900; // ₹999
const STANDARD_FEE_MINOR = 4900; // ₹49
const EXPRESS_FEE_MINOR = 14900; // ₹149
const SAME_DAY_FEE_MINOR = 24900; // ₹249

// First two digits of metro pincodes: Delhi, Mumbai, Bengaluru, Chennai, Kolkata
const METRO_PREFIXES = ['11', '40', '56', '60', '70'];

export function isValidPincode(pincode: string): boolean {
  return /^\d{6}$/.test(pincode);
}

// Mock rule: pincodes starting with 9 are not serviceable
export function isServiceable(pincode: string): boolean {
  return !pincode.startsWith('9');
}

function addDays(from: Date, days: number): string {
  const date = new Date(from);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

export function buildDeliveryOptions(
  pincode: string,
  subtotalMinor: number,
  today: Date = new Date(),
): DeliveryOption[] {
  const standardIsFree = subtotalMinor >= FREE_STANDARD_DELIVERY_FROM_MINOR;

  const options: DeliveryOption[] = [
    {
      id: 'standard',
      label: 'Standard delivery',
      description: standardIsFree ? 'Free on orders above ₹999' : 'Free on orders above ₹999',
      feeMinor: standardIsFree ? 0 : STANDARD_FEE_MINOR,
      estimatedFrom: addDays(today, 3),
      estimatedTo: addDays(today, 5),
    },
    {
      id: 'express',
      label: 'Express delivery',
      description: 'Priority handling',
      feeMinor: EXPRESS_FEE_MINOR,
      estimatedFrom: addDays(today, 1),
      estimatedTo: addDays(today, 2),
    },
  ];

  if (METRO_PREFIXES.some(prefix => pincode.startsWith(prefix))) {
    options.push({
      id: 'same_day',
      label: 'Same-day delivery',
      description: 'Order soon, arrives today',
      feeMinor: SAME_DAY_FEE_MINOR,
      estimatedFrom: addDays(today, 0),
      estimatedTo: addDays(today, 0),
    });
  }

  return options;
}
