export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  category: string;
  image?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  pointOfSale: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'in_production' | 'delivered';
  createdAt: string;
}

export const categories = [
  { id: 'soupes', name: 'Soupes', icon: '🍜' },
  { id: 'antipasti', name: 'Antipasti', icon: '🫒' },
  { id: 'produits-mer', name: 'Produits de la mer', icon: '🐟' },
  { id: 'sauces', name: 'Sauces', icon: '🥫' },
  { id: 'fromages', name: 'Fromages', icon: '🧀' },
  { id: 'viandes', name: 'Viandes / Volailles', icon: '🥩' },
  { id: 'epicerie', name: 'Épicerie', icon: '🏪' },
  { id: 'fruits-pulpe', name: 'Fruits et pulpe', icon: '🍓' },
  { id: 'frais', name: 'Frais', icon: '❄️' },
  { id: 'surgele', name: 'Surgelé', icon: '🧊' },
];

export const products: Product[] = [
  { id: '1', name: 'Velouté de butternut', description: 'Velouté onctueux à la courge butternut, touche de muscade', price: 4.50, unit: 'L', category: 'soupes' },
  { id: '2', name: 'Soupe de poisson', description: 'Soupe de poisson traditionnelle méditerranéenne', price: 6.20, unit: 'L', category: 'soupes' },
  { id: '3', name: 'Gaspacho tomate basilic', description: 'Gaspacho frais tomate et basilic', price: 5.80, unit: 'L', category: 'soupes' },
  { id: '4', name: 'Antipasti grillés mixtes', description: 'Assortiment de légumes grillés marinés', price: 8.90, unit: 'kg', category: 'antipasti' },
  { id: '5', name: 'Tomates confites', description: 'Tomates cerises semi-confites à l\'huile d\'olive', price: 12.50, unit: 'kg', category: 'antipasti' },
  { id: '6', name: 'Olives Kalamata', description: 'Olives Kalamata dénoyautées', price: 9.80, unit: 'kg', category: 'antipasti' },
  { id: '7', name: 'Saumon fumé tranché', description: 'Saumon fumé d\'Écosse, tranché finement', price: 32.00, unit: 'kg', category: 'produits-mer' },
  { id: '8', name: 'Crevettes décortiquées', description: 'Crevettes roses décortiquées cuites', price: 18.50, unit: 'kg', category: 'produits-mer' },
  { id: '9', name: 'Pesto basilic', description: 'Pesto au basilic frais, pignons et parmesan', price: 7.20, unit: 'kg', category: 'sauces' },
  { id: '10', name: 'Vinaigrette balsamique', description: 'Vinaigrette au vinaigre balsamique de Modène', price: 5.40, unit: 'L', category: 'sauces' },
  { id: '11', name: 'Mozzarella di Bufala', description: 'Mozzarella di Bufala Campana DOP', price: 15.80, unit: 'kg', category: 'fromages' },
  { id: '12', name: 'Parmesan Reggiano', description: 'Parmigiano Reggiano 24 mois, copeaux', price: 22.00, unit: 'kg', category: 'fromages' },
  { id: '13', name: 'Poulet rôti effiloché', description: 'Filets de poulet rôti effilochés', price: 14.20, unit: 'kg', category: 'viandes' },
  { id: '14', name: 'Jambon cru italien', description: 'Prosciutto di Parma 18 mois', price: 28.50, unit: 'kg', category: 'viandes' },
  { id: '15', name: 'Huile d\'olive extra vierge', description: 'Huile d\'olive extra vierge première pression', price: 8.90, unit: 'L', category: 'epicerie' },
  { id: '16', name: 'Coulis de mangue', description: 'Coulis de mangue Alphonso, 100% fruit', price: 9.50, unit: 'kg', category: 'fruits-pulpe' },
];

export const mockOrders: Order[] = [
  {
    id: 'CMD-001',
    pointOfSale: 'Le Petit Bistro - Lyon 2e',
    items: [
      { product: products[0], quantity: 5 },
      { product: products[3], quantity: 3 },
      { product: products[10], quantity: 2 },
    ],
    total: 60.30,
    status: 'pending',
    createdAt: '2026-04-14T08:30:00',
  },
  {
    id: 'CMD-002',
    pointOfSale: 'Salade & Co - Lyon 6e',
    items: [
      { product: products[6], quantity: 2 },
      { product: products[8], quantity: 4 },
      { product: products[14], quantity: 3 },
    ],
    total: 119.50,
    status: 'confirmed',
    createdAt: '2026-04-14T09:15:00',
  },
  {
    id: 'CMD-003',
    pointOfSale: 'Fresh Bowl - Lyon 3e',
    items: [
      { product: products[12], quantity: 5 },
      { product: products[4], quantity: 3 },
      { product: products[9], quantity: 2 },
    ],
    total: 119.30,
    status: 'in_production',
    createdAt: '2026-04-13T14:00:00',
  },
  {
    id: 'CMD-004',
    pointOfSale: 'Wrap Avenue - Villeurbanne',
    items: [
      { product: products[13], quantity: 2 },
      { product: products[1], quantity: 6 },
    ],
    total: 94.20,
    status: 'delivered',
    createdAt: '2026-04-12T10:00:00',
  },
];
