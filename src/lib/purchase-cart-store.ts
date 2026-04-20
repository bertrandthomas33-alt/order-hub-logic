import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PurchaseIngredient = {
  id: string;
  name: string;
  unit: string;
  cost_per_unit: number;
  supplier: string | null;
  supplier_id: string | null;
  supplier_title?: string | null;
  uvc: string | null;
  uvc_quantity: number;
};

export type PurchaseCartItem = {
  ingredient: PurchaseIngredient;
  quantity: number; // nombre d'UVC (conditionnement)
};

interface PurchaseCartStore {
  items: PurchaseCartItem[];
  addItem: (ingredient: PurchaseIngredient, quantity?: number) => void;
  removeItem: (ingredientId: string) => void;
  updateQuantity: (ingredientId: string, quantity: number) => void;
  clear: () => void;
  itemCount: () => number;
  total: () => number;
}

export const usePurchaseCartStore = create<PurchaseCartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (ingredient, quantity = 1) => {
        set((state) => {
          const existing = state.items.find((i) => i.ingredient.id === ingredient.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.ingredient.id === ingredient.id
                  ? { ...i, quantity: i.quantity + quantity, ingredient }
                  : i
              ),
            };
          }
          return { items: [...state.items, { ingredient, quantity }] };
        });
      },
      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.ingredient.id !== id) })),
      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.ingredient.id === id ? { ...i, quantity } : i
          ),
        }));
      },
      clear: () => set({ items: [] }),
      itemCount: () => get().items.reduce((s, i) => s + i.quantity, 0),
      total: () =>
        get().items.reduce(
          (s, i) =>
            s + i.quantity * (Number(i.ingredient.uvc_quantity) || 1) * (Number(i.ingredient.cost_per_unit) || 0),
          0
        ),
    }),
    { name: 'jdc-purchase-cart' }
  )
);
