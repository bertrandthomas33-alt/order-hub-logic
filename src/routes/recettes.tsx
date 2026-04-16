import { createFileRoute } from '@tanstack/react-router';
import { Header } from '@/components/Header';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, ChefHat, Clock, DollarSign, Pencil, Trash2, Eye, ArrowLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Navigate } from '@tanstack/react-router';

export const Route = createFileRoute('/recettes')({
  head: () => ({
    meta: [
      { title: 'Fiches Techniques — JDC Distribution' },
      { name: 'description', content: 'Gérez les recettes et fiches techniques de vos produits finis.' },
    ],
  }),
  component: RecettesPage,
});

type Ingredient = {
  id: string;
  name: string;
  unit: string;
  cost_per_unit: number;
  supplier: string | null;
  active: boolean;
};

type Recipe = {
  id: string;
  product_id: string;
  yield_quantity: number;
  yield_unit: string;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  instructions: string | null;
  image_url: string | null;
  notes: string | null;
  product?: { name: string; image_url: string | null; unit: string };
  recipe_ingredients?: RecipeIngredient[];
  recipe_steps?: RecipeStep[];
};

type RecipeIngredient = {
  id: string;
  recipe_id: string;
  ingredient_id: string;
  quantity: number;
  unit: string;
  ingredient?: Ingredient;
};

type RecipeStep = {
  id: string;
  recipe_id: string;
  step_number: number;
  instruction: string;
  duration_minutes: number | null;
  image_url: string | null;
};

type View = 'list' | 'detail' | 'edit';

function RecettesPage() {
  const { role, isLoading: authLoading } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<View>('list');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  // Form state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showIngredientDialog, setShowIngredientDialog] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Partial<Recipe> | null>(null);
  const [editSteps, setEditSteps] = useState<Partial<RecipeStep>[]>([]);
  const [editIngredients, setEditIngredients] = useState<{ ingredient_id: string; quantity: number; unit: string }[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [recipesRes, ingredientsRes, productsRes] = await Promise.all([
      supabase.from('recipes').select('*, product:products(name, image_url, unit), recipe_ingredients(*, ingredient:ingredients(*)), recipe_steps(*)').order('created_at', { ascending: false }),
      supabase.from('ingredients').select('*').eq('active', true).order('name'),
      supabase.from('products').select('id, name, image_url, unit, category_id, categories(name)').eq('active', true).order('name'),
    ]);
    if (recipesRes.data) setRecipes(recipesRes.data as any);
    if (ingredientsRes.data) setIngredients(ingredientsRes.data as any);
    if (productsRes.data) setProducts(productsRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (role !== 'admin') {
    return <Navigate to="/" />;
  }

  const filtered = recipes.filter(r =>
    r.product?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const productsWithoutRecipe = products.filter(
    p => !recipes.some(r => r.product_id === p.id)
  );

  const totalCost = (recipe: Recipe) => {
    return recipe.recipe_ingredients?.reduce((sum, ri) => {
      const cost = ri.ingredient?.cost_per_unit || 0;
      return sum + ri.quantity * cost;
    }, 0) || 0;
  };

  const handleCreateRecipe = async (productId: string) => {
    const { data, error } = await supabase.from('recipes').insert({
      product_id: productId,
      yield_quantity: 1,
      yield_unit: 'portion',
    }).select('*, product:products(name, image_url, unit)').single();
    if (error) { toast.error('Erreur création recette'); return; }
    toast.success('Recette créée');
    setShowCreateDialog(false);
    await fetchData();
    if (data) openEdit(data as any);
  };

  const openDetail = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setView('detail');
  };

  const openEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setEditSteps(
      recipe.recipe_steps?.sort((a, b) => a.step_number - b.step_number).map(s => ({ ...s })) || []
    );
    setEditIngredients(
      recipe.recipe_ingredients?.map(ri => ({
        ingredient_id: ri.ingredient_id,
        quantity: ri.quantity,
        unit: ri.unit,
      })) || []
    );
    setView('edit');
  };

  const handleSaveRecipe = async () => {
    if (!editingRecipe?.id) return;
    const recipeId = editingRecipe.id;

    // Update recipe fields
    const { error: recipeErr } = await supabase.from('recipes').update({
      yield_quantity: editingRecipe.yield_quantity || 1,
      yield_unit: editingRecipe.yield_unit || 'portion',
      prep_time_minutes: editingRecipe.prep_time_minutes,
      cook_time_minutes: editingRecipe.cook_time_minutes,
      instructions: editingRecipe.instructions,
      notes: editingRecipe.notes,
    }).eq('id', recipeId);

    if (recipeErr) { toast.error('Erreur sauvegarde recette'); return; }

    // Replace ingredients
    await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId);
    if (editIngredients.length > 0) {
      await supabase.from('recipe_ingredients').insert(
        editIngredients.map(i => ({ ...i, recipe_id: recipeId }))
      );
    }

    // Replace steps
    await supabase.from('recipe_steps').delete().eq('recipe_id', recipeId);
    if (editSteps.length > 0) {
      await supabase.from('recipe_steps').insert(
        editSteps.map((s, idx) => ({
          recipe_id: recipeId,
          step_number: idx + 1,
          instruction: s.instruction || '',
          duration_minutes: s.duration_minutes,
        }))
      );
    }

    toast.success('Recette sauvegardée');
    await fetchData();
    setView('list');
  };

  const handleDeleteRecipe = async (id: string) => {
    if (!confirm('Supprimer cette fiche technique ?')) return;
    await supabase.from('recipes').delete().eq('id', id);
    toast.success('Recette supprimée');
    setView('list');
    fetchData();
  };

  // ---- RENDER ----

  if (view === 'detail' && selectedRecipe) {
    return <RecipeDetailView recipe={selectedRecipe} totalCost={totalCost} onBack={() => { setView('list'); setSelectedRecipe(null); }} onEdit={() => openEdit(selectedRecipe)} onDelete={() => handleDeleteRecipe(selectedRecipe.id)} />;
  }

  if (view === 'edit' && editingRecipe) {
    return (
      <RecipeEditView
        recipe={editingRecipe}
        setRecipe={setEditingRecipe}
        steps={editSteps}
        setSteps={setEditSteps}
        recipeIngredients={editIngredients}
        setRecipeIngredients={setEditIngredients}
        allIngredients={ingredients}
        onSave={handleSaveRecipe}
        onCancel={() => setView('list')}
        showIngredientDialog={showIngredientDialog}
        setShowIngredientDialog={setShowIngredientDialog}
        onIngredientCreated={fetchData}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Fiches Techniques</h1>
            <p className="text-sm text-muted-foreground">Recettes et coûts de revient de vos produits finis</p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2" disabled={productsWithoutRecipe.length === 0}>
            <Plus className="h-4 w-4" />
            Nouvelle fiche
          </Button>
        </div>

        <div className="relative mb-6 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher un produit..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
            <ChefHat className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-lg font-medium text-muted-foreground">Aucune fiche technique</p>
            <p className="mt-1 text-sm text-muted-foreground/70">Créez votre première fiche pour un produit fini</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(recipe => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                totalCost={totalCost(recipe)}
                onView={() => openDetail(recipe)}
                onEdit={() => openEdit(recipe)}
              />
            ))}
          </div>
        )}

        {/* Dialog créer recette */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle fiche technique</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground mb-4">Sélectionnez le produit fini :</p>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {productsWithoutRecipe.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleCreateRecipe(p.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                >
                  {p.image_url && <img src={p.image_url} alt="" className="h-8 w-8 rounded object-cover" />}
                  <span className="font-medium">{p.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{(p as any).categories?.name}</span>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

// ---- Sub-components ----

function RecipeCard({ recipe, totalCost, onView, onEdit }: { recipe: Recipe; totalCost: number; onView: () => void; onEdit: () => void }) {
  const ingredientCount = recipe.recipe_ingredients?.length || 0;
  const stepCount = recipe.recipe_steps?.length || 0;
  const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);

  return (
    <div className="group rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        {recipe.product?.image_url ? (
          <img src={recipe.product.image_url} alt="" className="h-14 w-14 rounded-lg object-cover" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted">
            <ChefHat className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{recipe.product?.name}</h3>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {totalTime > 0 && (
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{totalTime} min</span>
            )}
            <span>{ingredientCount} ingrédient{ingredientCount > 1 ? 's' : ''}</span>
            <span>{stepCount} étape{stepCount > 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-1 text-sm">
          <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium text-foreground">{totalCost.toFixed(2)} €</span>
          <span className="text-muted-foreground">/ {recipe.yield_quantity} {recipe.yield_unit}</span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onView}><Eye className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}

function RecipeDetailView({ recipe, totalCost, onBack, onEdit, onDelete }: { recipe: Recipe; totalCost: (r: Recipe) => number; onBack: () => void; onEdit: () => void; onDelete: () => void }) {
  const cost = totalCost(recipe);
  const costPerUnit = recipe.yield_quantity ? cost / recipe.yield_quantity : cost;
  const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);
  const steps = recipe.recipe_steps?.sort((a, b) => a.step_number - b.step_number) || [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="font-heading text-2xl font-bold text-foreground flex-1">{recipe.product?.name}</h1>
          <Button variant="outline" size="sm" onClick={onEdit} className="gap-2"><Pencil className="h-4 w-4" />Modifier</Button>
          <Button variant="ghost" size="icon" className="text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
        </div>

        {/* Summary cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">Rendement</p>
            <p className="text-lg font-bold text-foreground">{recipe.yield_quantity} {recipe.yield_unit}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">Temps total</p>
            <p className="text-lg font-bold text-foreground">{totalTime > 0 ? `${totalTime} min` : '—'}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">Coût total</p>
            <p className="text-lg font-bold text-foreground">{cost.toFixed(2)} €</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">Coût / unité</p>
            <p className="text-lg font-bold text-foreground">{costPerUnit.toFixed(2)} €</p>
          </div>
        </div>

        {/* Ingredients */}
        <section className="mb-8">
          <h2 className="mb-3 font-heading text-lg font-semibold text-foreground">Ingrédients</h2>
          {recipe.recipe_ingredients && recipe.recipe_ingredients.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingrédient</TableHead>
                  <TableHead className="text-right">Quantité</TableHead>
                  <TableHead className="text-right">Coût</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipe.recipe_ingredients.map(ri => (
                  <TableRow key={ri.id}>
                    <TableCell className="font-medium">{ri.ingredient?.name}</TableCell>
                    <TableCell className="text-right">{ri.quantity} {ri.unit}</TableCell>
                    <TableCell className="text-right">{((ri.ingredient?.cost_per_unit || 0) * ri.quantity).toFixed(2)} €</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun ingrédient ajouté</p>
          )}
        </section>

        {/* Steps */}
        <section className="mb-8">
          <h2 className="mb-3 font-heading text-lg font-semibold text-foreground">Étapes de préparation</h2>
          {steps.length > 0 ? (
            <ol className="space-y-3">
              {steps.map(step => (
                <li key={step.id} className="flex gap-3 rounded-lg border border-border bg-card p-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {step.step_number}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{step.instruction}</p>
                    {step.duration_minutes && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />{step.duration_minutes} min
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune étape ajoutée</p>
          )}
        </section>

        {/* Notes */}
        {recipe.notes && (
          <section>
            <h2 className="mb-3 font-heading text-lg font-semibold text-foreground">Notes</h2>
            <p className="whitespace-pre-wrap rounded-lg border border-border bg-card p-4 text-sm text-foreground">{recipe.notes}</p>
          </section>
        )}
      </main>
    </div>
  );
}

function RecipeEditView({
  recipe, setRecipe, steps, setSteps, recipeIngredients, setRecipeIngredients,
  allIngredients, onSave, onCancel, showIngredientDialog, setShowIngredientDialog, onIngredientCreated,
}: {
  recipe: Partial<Recipe>;
  setRecipe: (r: Partial<Recipe> | null) => void;
  steps: Partial<RecipeStep>[];
  setSteps: (s: Partial<RecipeStep>[]) => void;
  recipeIngredients: { ingredient_id: string; quantity: number; unit: string }[];
  setRecipeIngredients: (ri: { ingredient_id: string; quantity: number; unit: string }[]) => void;
  allIngredients: Ingredient[];
  onSave: () => void;
  onCancel: () => void;
  showIngredientDialog: boolean;
  setShowIngredientDialog: (v: boolean) => void;
  onIngredientCreated: () => void;
}) {
  const [newIngName, setNewIngName] = useState('');
  const [newIngUnit, setNewIngUnit] = useState('kg');
  const [newIngCost, setNewIngCost] = useState('');

  const handleAddIngredientRow = () => {
    setRecipeIngredients([...recipeIngredients, { ingredient_id: '', quantity: 0, unit: 'kg' }]);
  };

  const handleRemoveIngredientRow = (idx: number) => {
    setRecipeIngredients(recipeIngredients.filter((_, i) => i !== idx));
  };

  const handleAddStep = () => {
    setSteps([...steps, { instruction: '', duration_minutes: undefined, step_number: steps.length + 1 }]);
  };

  const handleRemoveStep = (idx: number) => {
    setSteps(steps.filter((_, i) => i !== idx));
  };

  const handleCreateIngredient = async () => {
    if (!newIngName.trim()) return;
    const { error } = await supabase.from('ingredients').insert({
      name: newIngName.trim(),
      unit: newIngUnit,
      cost_per_unit: parseFloat(newIngCost) || 0,
    });
    if (error) { toast.error('Erreur création ingrédient'); return; }
    toast.success('Ingrédient créé');
    setNewIngName('');
    setNewIngCost('');
    setShowIngredientDialog(false);
    onIngredientCreated();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onCancel}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="font-heading text-2xl font-bold text-foreground flex-1">
            {recipe.product?.name || 'Édition recette'}
          </h1>
        </div>

        {/* General info */}
        <section className="mb-8 rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-heading text-lg font-semibold text-foreground">Informations générales</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className="text-xs text-muted-foreground">Rendement</label>
              <Input type="number" value={recipe.yield_quantity || ''} onChange={e => setRecipe({ ...recipe, yield_quantity: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Unité</label>
              <Input value={recipe.yield_unit || ''} onChange={e => setRecipe({ ...recipe, yield_unit: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Préparation (min)</label>
              <Input type="number" value={recipe.prep_time_minutes ?? ''} onChange={e => setRecipe({ ...recipe, prep_time_minutes: parseInt(e.target.value) || null })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Cuisson (min)</label>
              <Input type="number" value={recipe.cook_time_minutes ?? ''} onChange={e => setRecipe({ ...recipe, cook_time_minutes: parseInt(e.target.value) || null })} />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Notes</label>
            <Textarea value={recipe.notes || ''} onChange={e => setRecipe({ ...recipe, notes: e.target.value })} rows={3} />
          </div>
        </section>

        {/* Ingredients */}
        <section className="mb-8 rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold text-foreground">Ingrédients</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowIngredientDialog(true)}>Nouvel ingrédient</Button>
              <Button size="sm" onClick={handleAddIngredientRow} className="gap-1"><Plus className="h-3 w-3" />Ajouter</Button>
            </div>
          </div>
          {recipeIngredients.length > 0 ? (
            <div className="space-y-2">
              {recipeIngredients.map((ri, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Select value={ri.ingredient_id} onValueChange={v => {
                    const updated = [...recipeIngredients];
                    const ing = allIngredients.find(i => i.id === v);
                    updated[idx] = { ...updated[idx], ingredient_id: v, unit: ing?.unit || ri.unit };
                    setRecipeIngredients(updated);
                  }}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Ingrédient" /></SelectTrigger>
                    <SelectContent>
                      {allIngredients.map(i => (
                        <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="number" className="w-24" placeholder="Qté" value={ri.quantity || ''} onChange={e => {
                    const updated = [...recipeIngredients];
                    updated[idx] = { ...updated[idx], quantity: parseFloat(e.target.value) || 0 };
                    setRecipeIngredients(updated);
                  }} />
                  <Input className="w-20" value={ri.unit} onChange={e => {
                    const updated = [...recipeIngredients];
                    updated[idx] = { ...updated[idx], unit: e.target.value };
                    setRecipeIngredients(updated);
                  }} />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveIngredientRow(idx)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun ingrédient — cliquez "Ajouter"</p>
          )}
        </section>

        {/* Steps */}
        <section className="mb-8 rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold text-foreground">Étapes</h2>
            <Button size="sm" onClick={handleAddStep} className="gap-1"><Plus className="h-3 w-3" />Ajouter</Button>
          </div>
          {steps.length > 0 ? (
            <div className="space-y-3">
              {steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <span className="mt-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                    {idx + 1}
                  </span>
                  <div className="flex-1 space-y-2">
                    <Textarea
                      value={step.instruction || ''}
                      onChange={e => {
                        const updated = [...steps];
                        updated[idx] = { ...updated[idx], instruction: e.target.value };
                        setSteps(updated);
                      }}
                      rows={2}
                      placeholder="Décrivez cette étape..."
                    />
                    <Input
                      type="number"
                      className="w-32"
                      placeholder="Durée (min)"
                      value={step.duration_minutes ?? ''}
                      onChange={e => {
                        const updated = [...steps];
                        updated[idx] = { ...updated[idx], duration_minutes: parseInt(e.target.value) || undefined };
                        setSteps(updated);
                      }}
                    />
                  </div>
                  <Button variant="ghost" size="icon" className="mt-2 h-8 w-8 text-destructive" onClick={() => handleRemoveStep(idx)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune étape — cliquez "Ajouter"</p>
          )}
        </section>

        {/* Action buttons */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>Annuler</Button>
          <Button onClick={onSave}>Sauvegarder</Button>
        </div>

        {/* New ingredient dialog */}
        <Dialog open={showIngredientDialog} onOpenChange={setShowIngredientDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvel ingrédient</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Nom</label>
                <Input value={newIngName} onChange={e => setNewIngName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Unité</label>
                  <Input value={newIngUnit} onChange={e => setNewIngUnit(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Coût / unité (€)</label>
                  <Input type="number" step="0.01" value={newIngCost} onChange={e => setNewIngCost(e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowIngredientDialog(false)}>Annuler</Button>
              <Button onClick={handleCreateIngredient}>Créer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
