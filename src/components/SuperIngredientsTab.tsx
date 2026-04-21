import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Search, Sparkles, Pencil, Trash2, X, FileDown } from 'lucide-react';
import { downloadSuperIngredientPdf } from '@/lib/recipe-pdf';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { convertToBaseUnit, UNIT_OPTIONS } from '@/lib/units';

type SimpleIngredient = {
  id: string;
  name: string;
  unit: string;
  cost_per_unit: number;
  is_super: boolean;
  yield_quantity: number;
  yield_unit: string | null;
};

type Component = {
  id?: string;
  component_ingredient_id: string;
  quantity: number;
  unit: string;
};

type SuperIngredient = SimpleIngredient & {
  components?: (Component & { ingredient?: SimpleIngredient })[];
};

export function SuperIngredientsTab({ onRefresh }: { onRefresh: () => void }) {
  const [supers, setSupers] = useState<SuperIngredient[]>([]);
  const [allIngredients, setAllIngredients] = useState<SimpleIngredient[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<SuperIngredient | null>(null);
  const [toDelete, setToDelete] = useState<SuperIngredient | null>(null);

  const [form, setForm] = useState({
    name: '',
    unit: 'kg',
    yield_quantity: '1',
    yield_unit: 'kg',
  });
  const [components, setComponents] = useState<Component[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [superRes, ingRes] = await Promise.all([
      supabase
        .from('ingredients')
        .select('id, name, unit, cost_per_unit, is_super, yield_quantity, yield_unit')
        .eq('is_super', true)
        .order('name'),
      supabase
        .from('ingredients')
        .select('id, name, unit, cost_per_unit, is_super, yield_quantity, yield_unit')
        .order('name'),
    ]);

    if (superRes.data) {
      const ids = superRes.data.map((s) => s.id);
      let comps: any[] = [];
      if (ids.length > 0) {
        const { data: cdata } = await supabase
          .from('super_ingredient_components')
          .select('*, ingredient:ingredients!component_ingredient_id(id, name, unit, cost_per_unit)')
          .in('super_ingredient_id', ids);
        comps = cdata || [];
      }
      setSupers(
        superRes.data.map((s) => ({
          ...s,
          components: comps
            .filter((c) => c.super_ingredient_id === s.id)
            .map((c) => ({
              id: c.id,
              component_ingredient_id: c.component_ingredient_id,
              quantity: Number(c.quantity),
              unit: c.unit,
              ingredient: c.ingredient,
            })),
        })),
      );
    }
    if (ingRes.data) setAllIngredients(ingRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = supers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', unit: 'kg', yield_quantity: '1', yield_unit: 'kg' });
    setComponents([]);
    setShowDialog(true);
  };

  const openEdit = (s: SuperIngredient) => {
    setEditing(s);
    setForm({
      name: s.name,
      unit: s.unit,
      yield_quantity: String(s.yield_quantity || 1),
      yield_unit: s.yield_unit || s.unit,
    });
    setComponents(
      (s.components || []).map((c) => ({
        component_ingredient_id: c.component_ingredient_id,
        quantity: c.quantity,
        unit: c.unit,
      })),
    );
    setShowDialog(true);
  };

  const computedCost = (() => {
    const yld = parseFloat(form.yield_quantity) || 1;
    const total = components.reduce((sum, c) => {
      const ing = allIngredients.find((i) => i.id === c.component_ingredient_id);
      const baseQty = convertToBaseUnit(c.quantity || 0, c.unit, ing?.unit);
      return sum + (ing?.cost_per_unit || 0) * baseQty;
    }, 0);
    return total / yld;
  })();

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Nom requis');
      return;
    }
    if (components.length === 0) {
      toast.error('Ajoutez au moins un composant');
      return;
    }
    if (components.some((c) => !c.component_ingredient_id || c.quantity <= 0)) {
      toast.error('Tous les composants doivent avoir un ingrédient et une quantité');
      return;
    }

    const payload = {
      name: form.name.trim(),
      unit: form.unit,
      yield_quantity: parseFloat(form.yield_quantity) || 1,
      yield_unit: form.yield_unit,
      is_super: true,
    };

    let superId = editing?.id;

    if (editing) {
      const { error } = await supabase.from('ingredients').update(payload).eq('id', editing.id);
      if (error) {
        toast.error('Erreur mise à jour');
        return;
      }
    } else {
      const { data, error } = await supabase
        .from('ingredients')
        .insert({ ...payload, cost_per_unit: 0, stock_quantity: 0 })
        .select('id')
        .single();
      if (error || !data) {
        toast.error('Erreur création');
        return;
      }
      superId = data.id;
    }

    if (!superId) return;

    // Replace all components
    await supabase.from('super_ingredient_components').delete().eq('super_ingredient_id', superId);
    const { error: compErr } = await supabase.from('super_ingredient_components').insert(
      components.map((c) => ({
        super_ingredient_id: superId!,
        component_ingredient_id: c.component_ingredient_id,
        quantity: c.quantity,
        unit: c.unit,
      })),
    );
    if (compErr) {
      toast.error('Erreur enregistrement composants');
      return;
    }

    toast.success(editing ? 'Super ingrédient mis à jour' : 'Super ingrédient créé');
    setShowDialog(false);
    await fetchData();
    onRefresh();
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from('ingredients').delete().eq('id', toDelete.id);
    if (error) {
      toast.error('Erreur suppression (peut-être utilisé dans une recette)');
      return;
    }
    toast.success('Super ingrédient supprimé');
    setToDelete(null);
    await fetchData();
    onRefresh();
  };

  // Filter selectable ingredients (exclude self when editing to prevent self-reference)
  const selectableIngredients = allIngredients.filter((i) => i.id !== editing?.id);

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Super Ingrédients
          </h2>
          <p className="text-sm text-muted-foreground">
            Préparations intermédiaires composées d'autres ingrédients (sous-recettes)
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouveau super ingrédient
        </Button>
      </div>

      <div className="mb-6 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <Sparkles className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-lg font-medium text-muted-foreground">Aucun super ingrédient</p>
          <p className="text-sm text-muted-foreground mt-1">
            Créez une préparation réutilisable (sauce, marinade, base...)
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Composants</TableHead>
                <TableHead>Rendement</TableHead>
                <TableHead className="text-right">Coût / unité</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      {s.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {s.components?.length || 0} ingrédient(s)
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.yield_quantity} {s.yield_unit || s.unit}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {Number(s.cost_per_unit).toFixed(4)} € / {s.unit}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Imprimer la fiche technique"
                        onClick={() => downloadSuperIngredientPdf({
                          title: s.name,
                          yield_quantity: s.yield_quantity || 1,
                          yield_unit: s.yield_unit || s.unit,
                          components: (s.components || []).map(c => ({
                            name: c.ingredient?.name || '—',
                            quantity: c.quantity,
                            unit: c.unit,
                            is_super: c.ingredient?.is_super,
                          })),
                        })}
                      >
                        <FileDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(s)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setToDelete(s)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Modifier le super ingrédient' : 'Nouveau super ingrédient'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Nom</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="ex. Sauce tomate maison"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm text-muted-foreground">Unité de gestion</label>
                <Select
                  value={form.unit}
                  onValueChange={(v) => setForm({ ...form, unit: v, yield_unit: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Rendement</label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.yield_quantity}
                  onChange={(e) => setForm({ ...form, yield_quantity: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Unité rendement</label>
                <Select
                  value={form.yield_unit}
                  onValueChange={(v) => setForm({ ...form, yield_unit: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg border border-border p-3 bg-muted/30">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Composants
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setComponents([
                      ...components,
                      { component_ingredient_id: '', quantity: 0, unit: 'kg' },
                    ])
                  }
                >
                  <Plus className="h-3 w-3 mr-1" /> Ajouter
                </Button>
              </div>

              <div className="space-y-2">
                {components.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucun composant. Cliquez sur "Ajouter".
                  </p>
                )}
                {components.map((c, idx) => {
                  const ing = allIngredients.find((i) => i.id === c.component_ingredient_id);
                  const baseQty = convertToBaseUnit(c.quantity || 0, c.unit, ing?.unit);
                  const cost = (ing?.cost_per_unit || 0) * baseQty;
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <Select
                        value={c.component_ingredient_id}
                        onValueChange={(v) => {
                          const updated = [...components];
                          const newIng = allIngredients.find((i) => i.id === v);
                          updated[idx] = {
                            ...updated[idx],
                            component_ingredient_id: v,
                            unit: newIng?.unit || c.unit,
                          };
                          setComponents(updated);
                        }}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Ingrédient" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectableIngredients.map((i) => (
                            <SelectItem key={i.id} value={i.id}>
                              {i.is_super ? '⭐ ' : ''}
                              {i.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        step="0.001"
                        className="w-24"
                        placeholder="Qté"
                        value={c.quantity || ''}
                        onChange={(e) => {
                          const updated = [...components];
                          updated[idx] = {
                            ...updated[idx],
                            quantity: parseFloat(e.target.value) || 0,
                          };
                          setComponents(updated);
                        }}
                      />
                      <Select
                        value={c.unit}
                        onValueChange={(v) => {
                          const updated = [...components];
                          updated[idx] = { ...updated[idx], unit: v };
                          setComponents(updated);
                        }}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNIT_OPTIONS.map((u) => (
                            <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-sm tabular-nums w-20 text-right">
                        {cost.toFixed(2)} €
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() =>
                          setComponents(components.filter((_, i) => i !== idx))
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Coût calculé / {form.unit} :
                </span>
                <span className="font-semibold tabular-nums">
                  {computedCost.toFixed(4)} €
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce super ingrédient ?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-foreground">{toDelete?.name}</span> sera
              définitivement supprimé. S'il est utilisé dans une recette, la suppression
              échouera. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
