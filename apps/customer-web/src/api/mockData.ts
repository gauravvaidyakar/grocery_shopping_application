import type { Category, Product, VendorSummary } from './types';

const vendors: VendorSummary[] = [
  { id: 'vendor-odisha', name: 'Odisha Organics', location: 'Koraput, Odisha', rating: 4.8, productCount: 34 },
  { id: 'vendor-karnataka', name: 'Karnataka Millet Collective', location: 'Mandya, Karnataka', rating: 4.7, productCount: 28 },
  { id: 'vendor-maharashtra', name: 'Kolhapur Naturals', location: 'Kolhapur, Maharashtra', rating: 4.9, productCount: 41 },
  { id: 'vendor-rajasthan', name: 'Rajasthan Harvest', location: 'Jodhpur, Rajasthan', rating: 4.6, productCount: 22 },
];

const byVendor = (id: string): VendorSummary => {
  const vendor = vendors.find((candidate) => candidate.id === id);
  if (!vendor) throw new Error(`Missing mock vendor: ${id}`);
  return vendor;
};

export const mockCategories: Category[] = [
  { id: 'cat-millets', name: 'Millets', slug: 'millets', description: 'Wholesome traditional grains', imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80' },
  { id: 'cat-jaggery', name: 'Jaggery', slug: 'jaggery', description: 'Naturally sweet, minimally processed', imageUrl: 'https://images.unsplash.com/photo-1605197161470-d0261cac6767?auto=format&fit=crop&w=600&q=80' },
  { id: 'cat-pickles', name: 'Pickles', slug: 'pickles', description: 'Small-batch regional recipes', imageUrl: 'https://images.unsplash.com/photo-1589135233689-6c2a0f2e1c3c?auto=format&fit=crop&w=600&q=80' },
  { id: 'cat-spices', name: 'Spices', slug: 'spices', description: 'Aromatic, farm-sourced essentials', imageUrl: 'https://images.unsplash.com/photo-1532336414038-cf19250c5757?auto=format&fit=crop&w=600&q=80' },
  { id: 'cat-oils', name: 'Cold-pressed Oils', slug: 'oils', description: 'Traditional wood-pressed oils', imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80' },
  { id: 'cat-snacks', name: 'Millet Snacks', slug: 'snacks', description: 'Better everyday snacking', imageUrl: 'https://images.unsplash.com/photo-1599599810694-b5ac4dd812e1?auto=format&fit=crop&w=600&q=80' },
];

const money = (amount: number) => ({ amount, currency: 'INR' as const });

export const mockProducts: Product[] = [
  {
    id: 'prod-mango-pickle', slug: 'organic-mango-pickle', name: 'Organic Mango Pickle', categoryId: 'cat-pickles', categoryName: 'Pickles', productType: 'VALUE_ADDED', vendor: byVendor('vendor-odisha'), price: money(249), mrp: money(299), gstInclusive: true, weight: '500 g', description: 'Traditional mango pickle made in small batches with handpicked raw mangoes, cold-pressed mustard oil and sun-cured spices.', ingredients: ['Raw mango', 'Mustard oil', 'Rock salt', 'Fenugreek', 'Turmeric', 'Chilli'], specifications: { 'Shelf life': '6 months', 'Storage': 'Store in a cool, dry place', 'Food licence': 'FSSAI registered' }, images: ['https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1000&q=85', 'https://images.unsplash.com/photo-1589135233689-6c2a0f2e1c3c?auto=format&fit=crop&w=1000&q=85'], stockStatus: 'IN_STOCK', availableQuantity: 54, rating: 4.8, reviewCount: 238, featured: true, bestSeller: true,
  },
  {
    id: 'prod-ragi-flour', slug: 'stone-ground-ragi-flour', name: 'Stone-ground Ragi Flour', categoryId: 'cat-millets', categoryName: 'Millets', productType: 'RAW_COMMODITY', vendor: byVendor('vendor-karnataka'), price: money(189), mrp: money(215), gstInclusive: true, weight: '1 kg', description: 'Freshly milled whole-grain ragi flour sourced from a farmer collective in Karnataka.', ingredients: ['Whole ragi'], specifications: { 'Processing': 'Stone ground', 'Origin': 'Karnataka', 'Shelf life': '4 months' }, images: ['https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1000&q=85'], stockStatus: 'IN_STOCK', availableQuantity: 81, rating: 4.7, reviewCount: 164, featured: true, bestSeller: true,
  },
  {
    id: 'prod-jaggery', slug: 'natural-jaggery-blocks', name: 'Natural Jaggery Blocks', categoryId: 'cat-jaggery', categoryName: 'Jaggery', productType: 'RAW_COMMODITY', vendor: byVendor('vendor-maharashtra'), price: money(179), mrp: money(210), gstInclusive: true, weight: '500 g', description: 'Traditional sugarcane jaggery with a warm caramel flavour, made without sulphur treatment.', ingredients: ['Sugarcane juice'], specifications: { 'Processing': 'Sulphur free', 'Origin': 'Kolhapur', 'Shelf life': '8 months' }, images: ['https://images.unsplash.com/photo-1605197161470-d0261cac6767?auto=format&fit=crop&w=1000&q=85'], stockStatus: 'LOW_STOCK', availableQuantity: 8, rating: 4.9, reviewCount: 201, featured: true, bestSeller: true,
  },
  {
    id: 'prod-turmeric', slug: 'lakadong-turmeric-powder', name: 'Lakadong Turmeric Powder', categoryId: 'cat-spices', categoryName: 'Spices', productType: 'VALUE_ADDED', vendor: byVendor('vendor-odisha'), price: money(225), mrp: money(260), gstInclusive: true, weight: '200 g', description: 'Bright, aromatic turmeric ground in small batches for everyday cooking.', ingredients: ['Turmeric'], specifications: { 'Additives': 'None', 'Shelf life': '9 months', 'Pack type': 'Resealable pouch' }, images: ['https://images.unsplash.com/photo-1615485500704-8e990f9900f7?auto=format&fit=crop&w=1000&q=85'], stockStatus: 'IN_STOCK', availableQuantity: 43, rating: 4.6, reviewCount: 94, featured: false, bestSeller: true,
  },
  {
    id: 'prod-oil', slug: 'cold-pressed-groundnut-oil', name: 'Cold-pressed Groundnut Oil', categoryId: 'cat-oils', categoryName: 'Cold-pressed Oils', productType: 'VALUE_ADDED', vendor: byVendor('vendor-maharashtra'), price: money(499), mrp: money(575), gstInclusive: true, weight: '1 L', description: 'Wood-pressed groundnut oil with a naturally nutty aroma and no chemical refining.', ingredients: ['Groundnuts'], specifications: { 'Extraction': 'Wood pressed', 'Refining': 'Unrefined', 'Shelf life': '9 months' }, images: ['https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=1000&q=85'], stockStatus: 'IN_STOCK', availableQuantity: 29, rating: 4.8, reviewCount: 117, featured: true, bestSeller: false,
  },
  {
    id: 'prod-foxtail', slug: 'foxtail-millet', name: 'Unpolished Foxtail Millet', categoryId: 'cat-millets', categoryName: 'Millets', productType: 'RAW_COMMODITY', vendor: byVendor('vendor-karnataka'), price: money(229), mrp: money(255), gstInclusive: true, weight: '1 kg', description: 'Cleaned, unpolished foxtail millet with its natural bran and texture retained.', ingredients: ['Foxtail millet'], specifications: { 'Processing': 'Unpolished', 'Origin': 'Karnataka', 'Shelf life': '6 months' }, images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=1000&q=85'], stockStatus: 'IN_STOCK', availableQuantity: 64, rating: 4.5, reviewCount: 72, featured: false, bestSeller: false,
  },
  {
    id: 'prod-cookies', slug: 'ragi-almond-cookies', name: 'Ragi Almond Cookies', categoryId: 'cat-snacks', categoryName: 'Millet Snacks', productType: 'VALUE_ADDED', vendor: byVendor('vendor-karnataka'), price: money(169), mrp: money(195), gstInclusive: true, weight: '250 g', description: 'Crisp ragi cookies baked with almonds and jaggery for a satisfying tea-time bite.', ingredients: ['Ragi flour', 'Whole wheat flour', 'Jaggery', 'Almonds', 'Ghee'], specifications: { 'Eggless': 'Yes', 'Shelf life': '3 months', 'Pack type': 'Box' }, images: ['https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=1000&q=85'], stockStatus: 'IN_STOCK', availableQuantity: 35, rating: 4.7, reviewCount: 89, featured: true, bestSeller: true,
  },
  {
    id: 'prod-bajra', slug: 'pearl-millet-bajra', name: 'Pearl Millet (Bajra)', categoryId: 'cat-millets', categoryName: 'Millets', productType: 'RAW_COMMODITY', vendor: byVendor('vendor-rajasthan'), price: money(149), mrp: money(175), gstInclusive: true, weight: '1 kg', description: 'Naturally grown Rajasthan bajra, cleaned and packed close to source.', ingredients: ['Pearl millet'], specifications: { 'Origin': 'Rajasthan', 'Processing': 'Unpolished', 'Shelf life': '8 months' }, images: ['https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=1000&q=85'], stockStatus: 'OUT_OF_STOCK', availableQuantity: 0, rating: 4.4, reviewCount: 51, featured: false, bestSeller: false,
  },
];

export const mockVendors = vendors;
