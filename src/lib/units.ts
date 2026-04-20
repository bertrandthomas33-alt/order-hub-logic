// Conversion d'unités pour le calcul de coût des recettes / super ingrédients.
// Aligné avec la fonction SQL public.convert_to_base_unit.

const norm = (u: string | null | undefined) => {
  const x = (u || '').toLowerCase().trim();
  if (['l', 'liter', 'liters', 'litres'].includes(x)) return 'litre';
  if (['piece', 'pièce', 'pcs', 'u'].includes(x)) return 'unite';
  return x;
};

/**
 * Convertit une quantité saisie dans `fromUnit` vers `baseUnit` (l'unité de
 * gestion de l'ingrédient). Retourne la quantité telle quelle si les unités
 * sont identiques, vides ou incompatibles.
 *
 * Supporte: g <-> kg, ml <-> litre.
 */
export function convertToBaseUnit(
  qty: number,
  fromUnit: string | null | undefined,
  baseUnit: string | null | undefined,
): number {
  if (!qty || Number.isNaN(qty)) return 0;
  const f = norm(fromUnit);
  const b = norm(baseUnit);
  if (!f || !b || f === b) return qty;

  if (f === 'g' && b === 'kg') return qty / 1000;
  if (f === 'kg' && b === 'g') return qty * 1000;
  if (f === 'ml' && b === 'litre') return qty / 1000;
  if (f === 'litre' && b === 'ml') return qty * 1000;

  return qty;
}

export const UNIT_OPTIONS: { value: string; label: string }[] = [
  { value: 'kg', label: 'kg' },
  { value: 'g', label: 'g' },
  { value: 'litre', label: 'litre' },
  { value: 'ml', label: 'ml' },
  { value: 'unite', label: 'unité' },
];
