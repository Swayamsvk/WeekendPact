import type { Product } from '../types.js';

export const seedProducts: Product[] = [
  { id: 'p1', name: 'Cotton T-Shirt', priceMinor: 49900, currency: 'INR', image: 'https://picsum.photos/seed/p1/400', stock: 25 },
  { id: 'p2', name: 'Denim Jeans', priceMinor: 129900, currency: 'INR', image: 'https://picsum.photos/seed/p2/400', stock: 10 },
  { id: 'p3', name: 'Running Shoes', priceMinor: 249900, currency: 'INR', image: 'https://picsum.photos/seed/p3/400', stock: 5 },
  { id: 'p4', name: 'Leather Wallet', priceMinor: 79900, currency: 'INR', image: 'https://picsum.photos/seed/p4/400', stock: 40 },
  { id: 'p5', name: 'Analog Watch', priceMinor: 199900, currency: 'INR', image: 'https://picsum.photos/seed/p5/400', stock: 0 },
];
