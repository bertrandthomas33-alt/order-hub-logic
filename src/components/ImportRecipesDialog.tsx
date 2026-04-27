import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported: () => void;
};

type RowParsed = {
  recipe: string;
  category: string;
  price_b2c: number;
  yield_quantity: number;
  yield_unit: string;
  ingredient: string;
  quantity: number;
  unit: string;
};

const TEMPLATE_HEADERS = [
  'Recette',
  'Catégorie',
  'Prix vente TTC',
  'Rendement',
  'Unité rendement',
  'Ingrédient',
  'Quantité',
  'Unité',
];

const TEMPLATE_EXAMPLES = [
  ['Sauce tomate maison', 'Sauces', 5.5, 1, 'litre', 'Tomate', 1.2, 'kg'],
  ['Sauce tomate maison', 'Sauces', 5.5, 1, 'litre', 'Huile olive', 0.05, 'litre'],
  ['Sauce tomate maison', 'Sauces', 5.5, 1, 'litre', 'Sel', 0.01, 'kg'],
  ['Pizza Margherita', 'Pizzas', 12, 1, 'portion', 'Pâte à pizza', 0.25, 'kg'],
  ['Pizza Margherita', 'Pizzas', 12, 1, 'portion', 'Mozzarella', 0.15, 'kg'],
  ['Pizza Margherita', 'Pizzas', 12, 1, 'portion', 'Sauce tomate maison', 0.1, 'litre'],
];

export function ImportRecipesDialog({ open, onOpenChange, onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [report, setReport] = useState<{ created: number; ingredientsLinked: number; errors: string[] } | null>(null);

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...TEMPLATE_EXAMPLES]);
    ws['!cols'] = [
      { wch: 28 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 16 },
      { wch: 28 }, { wch: 12 }, { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Recettes');

    // Sheet d'instructions
    const instructions = [
      ['INSTRUCTIONS — Import de recettes'],
      [],
      ['1. Une LIGNE = un INGRÉDIENT d\'une recette.'],
      ['2. Répétez les colonnes Recette / Catégorie / Prix / Rendement à chaque ligne d\'une même recette.'],
      ['3. Les ingrédients inconnus seront créés automatiquement avec un coût à 0 €.'],
      ['4. Les catégories inconnues seront créées automatiquement.'],
      ['5. Si une recette existe déjà (même nom de produit), elle sera ignorée.'],
      [],
      ['Unités acceptées :'],
      ['  - Masse : g, kg'],
      ['  - Volume : ml, litre (ou l)'],
      ['  - Autre : unite (pièce)'],
      [],
      ['Colonnes obligatoires : Recette, Ingrédient, Quantité, Unité'],
      ['Colonnes optionnelles : Catégorie, Prix vente TTC, Rendement, Unité rendement'],
    ];
    const wsInst = XLSX.utils.aoa_to_sheet(instructions);
    wsInst['!cols'] = [{ wch: 80 }];
    XLSX.utils.book_append_sheet(wb, wsInst, 'Instructions');

    XLSX.writeFile(wb, 'template-import-recettes.xlsx');
    toast.success('Template téléchargé');
  };

  const parseFile = async (file: File): Promise<RowParsed[]> => {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const sheetName = wb.SheetNames.find(n => n.toLowerCase().includes('recette')) || wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json<any>(ws, { defval: '' });

    return json.map((r) => ({
      recipe: String(r['Recette'] || '').trim(),
      category: String(r['Catégorie'] || r['Categorie'] || '').trim(),
      price_b2c: Number(r['Prix vente TTC'] || r['Prix'] || 0) || 0,
      yield_quantity: Number(r['Rendement'] || 1) || 1,
      yield_unit: String(r['Unité rendement'] || r['Unite rendement'] || 'portion').trim() || 'portion',
      ingredient: String(r['Ingrédient'] || r['Ingredient'] || '').trim(),
      quantity: Number(r['Quantité'] || r['Quantite'] || 0) || 0,
      unit: String(r['Unité'] || r['Unite'] || 'kg').trim() || 'kg',
    })).filter(r => r.recipe && r.ingredient);
  };

  const handleFile = async (file: File) => {
    setImporting(true);
    setReport(null);
    const errors: string[] = [];
    let createdRecipes = 0;
    let linkedIngredients = 0;

    try {
      const rows = await parseFile(file);
      if (rows.length === 0) {
        toast.error('Aucune ligne valide trouvée dans le fichier');
        setImporting(false);
        return;
      }

      // Group by recipe name
      const groups = new Map<string, RowParsed[]>();
      for (const r of rows) {
        if (!groups.has(r.recipe)) groups.set(r.recipe, []);
        groups.get(r.recipe)!.push(r);
      }

      // Pré-charge data existantes
      const [{ data: existingProducts }, { data: existingCats }, { data: existingIngs }] = await Promise.all([
        supabase.from('products').select('id, name'),
        supabase.from('categories').select('id, name, warehouse_id'),
        supabase.from('ingredients').select('id, name, unit'),
      ]);

      const productByName = new Map((existingProducts || []).map(p => [p.name.toLowerCase(), p]));
      const catByName = new Map((existingCats || []).map(c => [c.name.toLowerCase(), c]));
      const ingByName = new Map((existingIngs || []).map(i => [i.name.toLowerCase(), i]));

      // Récupère un warehouse_id existant pour les nouvelles catégories
      const defaultWarehouseId = (existingCats || [])[0]?.warehouse_id;

      for (const [recipeName, items] of groups) {
        try {
          if (productByName.has(recipeName.toLowerCase())) {
            errors.push(`"${recipeName}" : produit déjà existant — ignoré`);
            continue;
          }

          const first = items[0];

          // Catégorie
          let categoryId: string | null = null;
          if (first.category) {
            const cat = catByName.get(first.category.toLowerCase());
            if (cat) {
              categoryId = cat.id;
            } else if (defaultWarehouseId) {
              const { data: newCat, error: catErr } = await supabase
                .from('categories')
                .insert({ name: first.category, warehouse_id: defaultWarehouseId })
                .select('id, name, warehouse_id')
                .single();
              if (catErr || !newCat) {
                errors.push(`"${recipeName}" : impossible de créer la catégorie "${first.category}"`);
                continue;
              }
              catByName.set(first.category.toLowerCase(), newCat);
              categoryId = newCat.id;
            }
          }
          if (!categoryId) {
            errors.push(`"${recipeName}" : aucune catégorie disponible — créez d'abord un entrepôt et une catégorie`);
            continue;
          }

          // Produit
          const { data: newProd, error: prodErr } = await supabase.from('products').insert({
            name: recipeName,
            category_id: categoryId,
            price_b2c: first.price_b2c,
            price: 0,
            cost_price: 0,
            stock: 0,
            unit: first.yield_unit || 'portion',
            active: false,
          }).select('id, name').single();
          if (prodErr || !newProd) {
            errors.push(`"${recipeName}" : erreur création produit — ${prodErr?.message}`);
            continue;
          }
          productByName.set(recipeName.toLowerCase(), newProd);

          // Recette
          const { data: newRec, error: recErr } = await supabase.from('recipes').insert({
            product_id: newProd.id,
            yield_quantity: first.yield_quantity,
            yield_unit: first.yield_unit,
          }).select('id').single();
          if (recErr || !newRec) {
            errors.push(`"${recipeName}" : erreur création recette — ${recErr?.message}`);
            continue;
          }

          // Ingrédients
          const ingredientPayload: Array<{ recipe_id: string; ingredient_id: string; quantity: number; unit: string }> = [];
          for (const it of items) {
            let ing = ingByName.get(it.ingredient.toLowerCase());
            if (!ing) {
              const { data: newIng, error: ingErr } = await supabase.from('ingredients').insert({
                name: it.ingredient,
                unit: it.unit || 'kg',
                cost_per_unit: 0,
                stock_quantity: 0,
              }).select('id, name, unit').single();
              if (ingErr || !newIng) {
                errors.push(`"${recipeName}" → ingrédient "${it.ingredient}" : ${ingErr?.message}`);
                continue;
              }
              ingByName.set(it.ingredient.toLowerCase(), newIng);
              ing = newIng;
            }
            ingredientPayload.push({
              recipe_id: newRec.id,
              ingredient_id: ing.id,
              quantity: it.quantity,
              unit: it.unit || ing.unit,
            });
          }

          if (ingredientPayload.length > 0) {
            const { error: linkErr } = await supabase.from('recipe_ingredients').insert(ingredientPayload);
            if (linkErr) {
              errors.push(`"${recipeName}" : erreur ajout ingrédients — ${linkErr.message}`);
            } else {
              linkedIngredients += ingredientPayload.length;
            }
          }

          createdRecipes++;
        } catch (e: any) {
          errors.push(`"${recipeName}" : ${e?.message || 'erreur inconnue'}`);
        }
      }

      setReport({ created: createdRecipes, ingredientsLinked: linkedIngredients, errors });
      if (createdRecipes > 0) {
        toast.success(`${createdRecipes} recette(s) importée(s)`);
        onImported();
      } else if (errors.length > 0) {
        toast.error('Aucune recette importée — voir le rapport');
      }
    } catch (e: any) {
      toast.error(`Erreur lecture fichier : ${e?.message}`);
    } finally {
      setImporting(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importer des recettes
          </DialogTitle>
          <DialogDescription>
            Importez plusieurs fiches techniques depuis un fichier Excel. Téléchargez d'abord le template pour avoir le bon format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <h3 className="font-medium text-sm mb-2">Étape 1 — Téléchargez le template</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Le fichier contient les colonnes attendues, des exemples et un onglet d'instructions.
            </p>
            <Button variant="outline" onClick={downloadTemplate} className="gap-2">
              <Download className="h-4 w-4" /> Télécharger le template Excel
            </Button>
          </div>

          <div className="rounded-lg border border-border p-4">
            <h3 className="font-medium text-sm mb-2">Étape 2 — Importez votre fichier rempli</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Une ligne = un ingrédient d'une recette. Les ingrédients et catégories inconnus seront créés automatiquement.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <Button
              onClick={() => inputRef.current?.click()}
              disabled={importing}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {importing ? 'Import en cours...' : 'Choisir un fichier Excel'}
            </Button>
          </div>

          {report && (
            <div className="rounded-lg border border-border p-4 space-y-2 max-h-64 overflow-y-auto">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="font-medium">
                  {report.created} recette(s) créée(s) — {report.ingredientsLinked} ingrédient(s) liés
                </span>
              </div>
              {report.errors.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">{report.errors.length} avertissement(s) :</span>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1 pl-6 list-disc">
                    {report.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
