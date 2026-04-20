import { createFileRoute } from '@tanstack/react-router';
import { Header } from '@/components/Header';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, ChefHat, Clock, Euro, Pencil, Trash2, Eye, ArrowLeft, X, Package, Truck, ShoppingCart, Warehouse, Sparkles, ChevronDown, ShoppingBasket, Minus, CheckCircle2, History } from 'lucide-react';
import { usePurchaseCartStore, type PurchaseCartItem } from '@/lib/purchase-cart-store';
import { SuperIngredientsTab } from '@/components/SuperIngredientsTab';
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Navigate } from '@tanstack/react-router';
import { ImageUpload } from '@/components/ImageUpload';
import { convertToBaseUnit, UNIT_OPTIONS } from '@/lib/units';

type RecettesSearch = { productId?: string };

export const Route = createFileRoute('/recettes')({
  validateSearch: (search: Record<string, unknown>): RecettesSearch => ({
    productId: typeof search.productId === 'string' ? search.productId : undefined,
  }),
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
  supplier_id: string | null;
  supplier_ref?: { id: string; title: string } | null;
  stock_quantity: number;
  uvc: string | null;
  uvc_quantity: number;
  active: boolean;
  is_super?: boolean;
  yield_quantity?: number;
  yield_unit?: string | null;
};

type SupplierOption = { id: string; title: string };

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
  product?: { name: string; image_url: string | null; unit: string; category_id: string; categories: { name: string } | null };
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
  const { productId: autoEditProductId } = Route.useSearch();
  const { role, isLoading: authLoading } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<View>('list');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [activeTab, setActiveTab] = useState('fiches');
  const [editIngredientId, setEditIngredientId] = useState<string | null>(null);
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);

  // Form state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showIngredientDialog, setShowIngredientDialog] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Partial<Recipe> | null>(null);
  const [editSteps, setEditSteps] = useState<Partial<RecipeStep>[]>([]);
  const [editIngredients, setEditIngredients] = useState<{ ingredient_id: string; quantity: number; unit: string }[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [recipesRes, ingredientsRes, productsRes, categoriesRes] = await Promise.all([
      supabase.from('recipes').select('*, product:products(name, image_url, unit, category_id, categories(name)), recipe_ingredients(*, ingredient:ingredients(*)), recipe_steps(*)').order('created_at', { ascending: false }),
      supabase.from('ingredients').select('*, supplier_ref:suppliers(id, title)').order('name'),
      supabase.from('products').select('id, name, image_url, unit, category_id, categories(name)').eq('active', true).order('name'),
      supabase.from('categories').select('id, name').order('name'),
    ]);
    if (recipesRes.data) setRecipes(recipesRes.data as any);
    if (ingredientsRes.data) setIngredients(ingredientsRes.data as any);
    if (productsRes.data) setProducts(productsRes.data);
    if (categoriesRes.data) setCategories(categoriesRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-open edit for a specific product (from Ctrl+R in backoffice)
  const [autoEditHandled, setAutoEditHandled] = useState(false);
  useEffect(() => {
    if (autoEditHandled || loading || !autoEditProductId) return;
    setAutoEditHandled(true);
    const recipe = recipes.find(r => r.product_id === autoEditProductId);
    if (recipe) {
      openEdit(recipe);
    } else {
      handleCreateRecipe(autoEditProductId);
    }
  }, [autoEditProductId, loading, recipes, autoEditHandled]);

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
      const baseQty = convertToBaseUnit(ri.quantity, ri.unit, ri.ingredient?.unit);
      return sum + baseQty * cost;
    }, 0) || 0;
  };

  const handleCreateRecipe = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    const { data, error } = await supabase.from('recipes').insert({
      product_id: productId,
      yield_quantity: 1,
      yield_unit: 'portion',
      image_url: product?.image_url || null,
    }).select('*, product:products(name, image_url, unit)').single();
    if (error) { toast.error('Erreur création recette'); return; }
    toast.success('Recette créée');
    setShowCreateDialog(false);
    await fetchData();
    if (data) openEdit(data as any);
  };

  const handleCreateNewProductRecipe = async (payload: { name: string; category_id: string; price_b2c: number }) => {
    const { data: product, error: prodErr } = await supabase.from('products').insert({
      name: payload.name,
      category_id: payload.category_id,
      price_b2c: payload.price_b2c,
      price: 0,
      cost_price: 0,
      stock: 0,
      unit: 'portion',
      active: false,
    }).select('id, name, image_url, unit, category_id, categories(name)').single();
    if (prodErr || !product) { toast.error('Erreur création produit'); console.error(prodErr); return; }

    const { data: recipe, error: recErr } = await supabase.from('recipes').insert({
      product_id: product.id,
      yield_quantity: 1,
      yield_unit: 'portion',
    }).select('*, product:products(name, image_url, unit, category_id, categories(name))').single();
    if (recErr) { toast.error('Erreur création recette'); console.error(recErr); return; }

    toast.success('Fiche technique créée');
    setShowCreateDialog(false);
    await fetchData();
    if (recipe) openEdit(recipe as any);
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

    const { error: recipeErr } = await supabase.from('recipes').update({
      yield_quantity: editingRecipe.yield_quantity || 1,
      yield_unit: editingRecipe.yield_unit || 'portion',
      prep_time_minutes: editingRecipe.prep_time_minutes,
      cook_time_minutes: editingRecipe.cook_time_minutes,
      instructions: editingRecipe.instructions,
      notes: editingRecipe.notes,
      image_url: editingRecipe.image_url,
    }).eq('id', recipeId);

    if (recipeErr) { toast.error('Erreur sauvegarde recette'); return; }

    await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId);
    if (editIngredients.length > 0) {
      await supabase.from('recipe_ingredients').insert(
        editIngredients.map(i => ({ ...i, recipe_id: recipeId }))
      );
    }

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

    // Recalcul du prix de revient du produit à partir des ingrédients de la recette
    if (editingRecipe.product_id && editIngredients.length > 0) {
      const totalCost = editIngredients.reduce((sum, ri) => {
        const ing = ingredients.find(i => i.id === ri.ingredient_id);
        return sum + (ing?.cost_per_unit || 0) * (ri.quantity || 0);
      }, 0);
      const yieldQty = editingRecipe.yield_quantity || 1;
      const costPerUnit = totalCost / yieldQty;
      await supabase.from('products').update({ cost_price: Number(costPerUnit.toFixed(4)) }).eq('id', editingRecipe.product_id);
    }

    toast.success('Recette sauvegardée');
    await fetchData();
    setView('list');
  };


  const handleDeleteRecipe = async (id: string) => {
    const { error } = await supabase.from('recipes').delete().eq('id', id);
    if (error) { toast.error('Erreur suppression'); return; }
    toast.success('Fiche technique supprimée');
    setRecipeToDelete(null);
    setView('list');
    setSelectedRecipe(null);
    fetchData();
  };

  // ---- Detail / Edit views ----
  if (view === 'detail' && selectedRecipe) {
    return (
      <>
        <RecipeDetailView recipe={selectedRecipe} totalCost={totalCost} onBack={() => { setView('list'); setSelectedRecipe(null); }} onEdit={() => openEdit(selectedRecipe)} onDelete={() => setRecipeToDelete(selectedRecipe)} />
        <DeleteRecipeDialog recipe={recipeToDelete} onCancel={() => setRecipeToDelete(null)} onConfirm={() => recipeToDelete && handleDeleteRecipe(recipeToDelete.id)} />
      </>
    );
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

  // ---- Main tabbed view ----
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 overflow-x-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="-mx-4 sm:mx-0 mb-6 overflow-x-auto scrollbar-none">
            <TabsList className="inline-flex w-max justify-start gap-1 mx-4 sm:mx-0">
              <TabsTrigger value="fiches" className="gap-2 whitespace-nowrap"><ChefHat className="h-4 w-4" /><span className="hidden xs:inline sm:inline">Fiches Techniques</span><span className="xs:hidden sm:hidden">Fiches</span></TabsTrigger>
              <TabsTrigger value="ingredients" className="gap-2 whitespace-nowrap"><Package className="h-4 w-4" />Ingrédients</TabsTrigger>
              <TabsTrigger value="super" className="gap-2 whitespace-nowrap"><Sparkles className="h-4 w-4" /><span className="hidden xs:inline sm:inline">Super Ingrédients</span><span className="xs:hidden sm:hidden">Super</span></TabsTrigger>
              <TabsTrigger value="fournisseurs" className="gap-2 whitespace-nowrap"><Truck className="h-4 w-4" />Fournisseurs</TabsTrigger>
              <TabsTrigger value="commandes" className="gap-2 whitespace-nowrap"><ShoppingCart className="h-4 w-4" />Commandes</TabsTrigger>
              <TabsTrigger value="stock" className="gap-2 whitespace-nowrap"><Warehouse className="h-4 w-4" />Stock</TabsTrigger>
            </TabsList>
          </div>

          {/* ===== FICHES TECHNIQUES ===== */}
          <TabsContent value="fiches">
            <FichesTab
              filtered={filtered}
              search={search}
              setSearch={setSearch}
              loading={loading}
              productsWithoutRecipe={productsWithoutRecipe}
              categories={categories}
              showCreateDialog={showCreateDialog}
              setShowCreateDialog={setShowCreateDialog}
              handleCreateRecipe={handleCreateRecipe}
              handleCreateNewProductRecipe={handleCreateNewProductRecipe}
              totalCost={totalCost}
              openDetail={openDetail}
              openEdit={openEdit}
              onDelete={(r) => setRecipeToDelete(r)}
            />
          </TabsContent>

          {/* ===== INGRÉDIENTS ===== */}
          <TabsContent value="ingredients">
            <IngredientsTab
              ingredients={ingredients.filter(i => !i.is_super)}
              onRefresh={fetchData}
              autoEditId={editIngredientId}
              onAutoEditConsumed={() => setEditIngredientId(null)}
            />
          </TabsContent>

          {/* ===== SUPER INGRÉDIENTS ===== */}
          <TabsContent value="super">
            <SuperIngredientsTab onRefresh={fetchData} />
          </TabsContent>

          {/* ===== FOURNISSEURS ===== */}
          <TabsContent value="fournisseurs">
            <FournisseursTab />
          </TabsContent>

          {/* ===== COMMANDES ===== */}
          <TabsContent value="commandes">
            <CommandesTab recipes={recipes} ingredients={ingredients} onRefresh={fetchData} />
          </TabsContent>

          {/* ===== STOCK ===== */}
          <TabsContent value="stock">
            <StockTab
              ingredients={ingredients}
              onRefresh={fetchData}
              onOpenIngredient={(id) => {
                setEditIngredientId(id);
                setActiveTab('ingredients');
              }}
            />
          </TabsContent>
        </Tabs>
      </main>
      <DeleteRecipeDialog recipe={recipeToDelete} onCancel={() => setRecipeToDelete(null)} onConfirm={() => recipeToDelete && handleDeleteRecipe(recipeToDelete.id)} />
    </div>
  );
}

function DeleteRecipeDialog({ recipe, onCancel, onConfirm }: { recipe: Recipe | null; onCancel: () => void; onConfirm: () => void }) {
  return (
    <AlertDialog open={!!recipe} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer la fiche technique ?</AlertDialogTitle>
          <AlertDialogDescription>
            La fiche technique de <span className="font-semibold text-foreground">{recipe?.product?.name}</span> sera définitivement supprimée, ainsi que ses ingrédients et étapes. Le produit lui-même ne sera pas supprimé. Cette action est irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ===== FICHES TAB =====
function FichesTab({ filtered, search, setSearch, loading, productsWithoutRecipe, categories, showCreateDialog, setShowCreateDialog, handleCreateRecipe, handleCreateNewProductRecipe, totalCost, openDetail, openEdit, onDelete }: {
  filtered: Recipe[];
  search: string;
  setSearch: (s: string) => void;
  loading: boolean;
  productsWithoutRecipe: any[];
  categories: { id: string; name: string }[];
  showCreateDialog: boolean;
  setShowCreateDialog: (v: boolean) => void;
  handleCreateRecipe: (id: string) => void;
  handleCreateNewProductRecipe: (payload: { name: string; category_id: string; price_b2c: number }) => void;
  totalCost: (r: Recipe) => number;
  openDetail: (r: Recipe) => void;
  openEdit: (r: Recipe) => void;
  onDelete: (r: Recipe) => void;
}) {
  const [categoryTab, setCategoryTab] = useState<string>('all');
  const [createMode, setCreateMode] = useState<'new' | 'existing'>('new');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newPriceB2c, setNewPriceB2c] = useState('');

  useEffect(() => {
    if (showCreateDialog) {
      setCreateMode('new');
      setNewName('');
      setNewCategory('');
      setNewPriceB2c('');
    }
  }, [showCreateDialog]);

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">Fiches Techniques</h2>
          <p className="text-sm text-muted-foreground">Recettes et coûts de revient de vos produits finis</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />Nouvelle fiche
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
      ) : (() => {
        const grouped = filtered.reduce<Record<string, Recipe[]>>((acc, recipe) => {
          const catName = recipe.product?.categories?.name || 'Sans catégorie';
          if (!acc[catName]) acc[catName] = [];
          acc[catName].push(recipe);
          return acc;
        }, {});
        const sortedCategories = Object.keys(grouped).sort((a, b) =>
          a === 'Sans catégorie' ? 1 : b === 'Sans catégorie' ? -1 : a.localeCompare(b)
        );
        const activeCat = categoryTab !== 'all' && grouped[categoryTab] ? categoryTab : 'all';
        const visibleCategories = activeCat === 'all' ? sortedCategories : [activeCat];
        return (
          <>
            <Tabs value={activeCat} onValueChange={setCategoryTab} className="mb-6">
              <TabsList className="flex w-full flex-wrap justify-start gap-1 h-auto">
                <TabsTrigger value="all">Toutes ({filtered.length})</TabsTrigger>
                {sortedCategories.map(cat => (
                  <TabsTrigger key={cat} value={cat}>
                    {cat} ({grouped[cat].length})
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="space-y-8">
              {visibleCategories.map(catName => (
                <section key={catName}>
                  {activeCat === 'all' && (
                    <h3 className="mb-3 font-heading text-lg font-semibold text-foreground border-b border-border pb-2">{catName}</h3>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {grouped[catName].map(recipe => (
                      <RecipeCard
                        key={recipe.id}
                        recipe={recipe}
                        totalCost={totalCost(recipe)}
                        onView={() => openDetail(recipe)}
                        onEdit={() => openEdit(recipe)}
                        onDelete={() => onDelete(recipe)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        );
      })()}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle fiche technique</DialogTitle>
          </DialogHeader>

          <Tabs value={createMode} onValueChange={(v) => setCreateMode(v as 'new' | 'existing')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="new">Nouveau produit</TabsTrigger>
              <TabsTrigger value="existing" disabled={productsWithoutRecipe.length === 0}>
                Produit existant ({productsWithoutRecipe.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="new" className="space-y-4 pt-4">
              <div>
                <label className="text-xs text-muted-foreground">Nom du plat</label>
                <Input
                  placeholder="Ex : Salade César"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Catégorie</label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner une catégorie" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Prix B2C (€)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newPriceB2c}
                  onChange={(e) => setNewPriceB2c(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Annuler</Button>
                <Button
                  onClick={() => {
                    if (!newName.trim()) { toast.error('Nom requis'); return; }
                    if (!newCategory) { toast.error('Catégorie requise'); return; }
                    handleCreateNewProductRecipe({
                      name: newName.trim(),
                      category_id: newCategory,
                      price_b2c: parseFloat(newPriceB2c) || 0,
                    });
                  }}
                >
                  Créer la fiche
                </Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="existing" className="pt-4">
              <p className="text-sm text-muted-foreground mb-3">Sélectionnez le produit fini :</p>
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
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ===== INGRÉDIENTS TAB =====
function IngredientsTab({ ingredients, onRefresh, autoEditId, onAutoEditConsumed }: { ingredients: Ingredient[]; onRefresh: () => void; autoEditId?: string | null; onAutoEditConsumed?: () => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [form, setForm] = useState({ name: '', unit: 'kg', cost_per_unit: '', supplier_id: '', stock_quantity: '', uvc_pieces: '1', uvc_piece_qty: '1', uvc_piece_unit: 'kg', uvc_price: '' });
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [qtyDraft, setQtyDraft] = useState<Record<string, string>>({});
  const cartItems = usePurchaseCartStore(s => s.items);

  // Conversion factor: how many "unit" are in 1 "subUnit"
  // unit ∈ {kg, litre, unite}, subUnit ∈ {kg, g, litre, ml, unite}
  const conversionFactor = (unit: string, subUnit: string): number => {
    if (unit === 'kg') {
      if (subUnit === 'kg') return 1;
      if (subUnit === 'g') return 0.001;
    }
    if (unit === 'litre') {
      if (subUnit === 'litre') return 1;
      if (subUnit === 'ml') return 0.001;
    }
    if (unit === 'unite' && subUnit === 'unite') return 1;
    return 1;
  };

  const subUnitOptions = (unit: string): string[] => {
    if (unit === 'kg') return ['kg', 'g'];
    if (unit === 'litre') return ['litre', 'ml'];
    return ['unite'];
  };

  // Total quantity in management unit
  const computeUvcTotalQty = (pieces: string, pieceQty: string, unit: string, subUnit: string): number => {
    const p = parseFloat(pieces) || 0;
    const q = parseFloat(pieceQty) || 0;
    return p * q * conversionFactor(unit, subUnit);
  };

  useEffect(() => {
    supabase.from('suppliers').select('id, title').eq('active', true).order('title').then(({ data }) => {
      if (data) setSuppliers(data);
    });
  }, []);

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const filtered = ingredients.filter(i => {
    const q = searchTerm.toLowerCase();
    return i.name.toLowerCase().includes(q) ||
      (i.supplier_ref?.title || i.supplier || '').toLowerCase().includes(q);
  });

  // Group by supplier
  const groupedBySupplier = filtered.reduce<Record<string, { title: string; items: Ingredient[] }>>((acc, ing) => {
    const key = ing.supplier_ref?.id || ing.supplier_id || '__none__';
    const title = ing.supplier_ref?.title || ing.supplier || '— Sans fournisseur —';
    if (!acc[key]) acc[key] = { title, items: [] };
    acc[key].items.push(ing);
    return acc;
  }, {});
  const sortedGroups = Object.entries(groupedBySupplier).sort(([a, ga], [b, gb]) => {
    if (a === '__none__') return 1;
    if (b === '__none__') return -1;
    return ga.title.localeCompare(gb.title);
  });

  const toggleGroup = (key: string) => setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }));

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', unit: 'kg', cost_per_unit: '', supplier_id: '', stock_quantity: '', uvc_pieces: '1', uvc_piece_qty: '1', uvc_piece_unit: 'kg', uvc_price: '' });
    setShowDialog(true);
  };

  // Try to parse stored uvc label like "12x500 g" or "5 kg" → pieces & per-piece qty
  const parseUvcLabel = (label: string | null, unit: string, totalQty: number): { pieces: string; pieceQty: string; pieceUnit: string } => {
    const defaultSub = unit === 'kg' ? 'kg' : unit === 'litre' ? 'litre' : 'unite';
    if (label) {
      const m = label.match(/^\s*(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*([a-zA-Zé]+)?/);
      if (m) {
        const pieces = m[1].replace(',', '.');
        const qty = m[2].replace(',', '.');
        const sub = (m[3] || defaultSub).toLowerCase();
        const allowed = unit === 'kg' ? ['kg', 'g'] : unit === 'litre' ? ['litre', 'ml', 'l'] : ['unite', 'u'];
        const normalized = sub === 'l' ? 'litre' : sub === 'u' ? 'unite' : sub;
        return { pieces, pieceQty: qty, pieceUnit: allowed.includes(normalized) ? normalized : defaultSub };
      }
    }
    return { pieces: '1', pieceQty: String(totalQty || 1), pieceUnit: defaultSub };
  };

  const openEditIng = (ing: Ingredient) => {
    setEditing(ing);
    const uvcQty = Number(ing.uvc_quantity) || 1;
    const cost = Number(ing.cost_per_unit) || 0;
    const parsed = parseUvcLabel(ing.uvc, ing.unit, uvcQty);
    setForm({
      name: ing.name,
      unit: ing.unit,
      cost_per_unit: String(cost || ''),
      supplier_id: ing.supplier_id || '',
      stock_quantity: String(ing.stock_quantity ?? ''),
      uvc_pieces: parsed.pieces,
      uvc_piece_qty: parsed.pieceQty,
      uvc_piece_unit: parsed.pieceUnit,
      uvc_price: cost ? (cost * uvcQty).toFixed(2) : '',
    });
    setShowDialog(true);
  };

  // Auto-open edit dialog when triggered from another tab (e.g. Stock double-click)
  useEffect(() => {
    if (!autoEditId) return;
    const ing = ingredients.find(i => i.id === autoEditId);
    if (ing) {
      openEditIng(ing);
      onAutoEditConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoEditId, ingredients]);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Nom requis'); return; }
    const uvcQty = computeUvcTotalQty(form.uvc_pieces, form.uvc_piece_qty, form.unit, form.uvc_piece_unit) || 1;
    const costPerUnit = parseFloat(form.cost_per_unit) || 0;
    const pieces = parseFloat(form.uvc_pieces) || 1;
    const pieceQty = parseFloat(form.uvc_piece_qty) || 0;
    const uvcLabel = pieces > 1
      ? `${pieces}x${pieceQty} ${form.uvc_piece_unit}`
      : `${pieceQty} ${form.uvc_piece_unit}`;
    const payload = {
      name: form.name.trim(),
      unit: form.unit,
      cost_per_unit: costPerUnit,
      supplier_id: form.supplier_id || null,
      stock_quantity: parseFloat(form.stock_quantity) || 0,
      uvc_quantity: uvcQty,
      uvc: uvcLabel,
    };

    if (editing) {
      const { error } = await supabase.from('ingredients').update(payload).eq('id', editing.id);
      if (error) { toast.error('Erreur mise à jour'); return; }
      toast.success('Ingrédient mis à jour');
    } else {
      const { error } = await supabase.from('ingredients').insert(payload);
      if (error) { toast.error('Erreur création'); return; }
      toast.success('Ingrédient créé');
    }
    setShowDialog(false);
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet ingrédient ?')) return;
    const { error } = await supabase.from('ingredients').delete().eq('id', id);
    if (error) { toast.error('Erreur suppression (peut-être utilisé dans une recette)'); return; }
    toast.success('Ingrédient supprimé');
    onRefresh();
  };

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">Ingrédients</h2>
          <p className="text-sm text-muted-foreground">Gérez votre base d'ingrédients avec coûts et fournisseurs</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />Nouvel ingrédient</Button>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <Package className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-lg font-medium text-muted-foreground">Aucun ingrédient</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedGroups.map(([key, group]) => {
            const collapsed = !!collapsedGroups[key];
            const groupIngredientIds = new Set(group.items.map(i => i.id));
            const pendingItems = cartItems.filter(ci => groupIngredientIds.has(ci.ingredient.id));
            const pendingUvc = pendingItems.reduce((s, i) => s + i.quantity, 0);
            return (
              <div key={key} className="rounded-xl border border-border bg-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleGroup(key)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ChevronDown className={`h-4 w-4 transition-transform shrink-0 ${collapsed ? '-rotate-90' : ''}`} />
                    <span className="font-semibold text-foreground truncate">{group.title}</span>
                    <span className="text-xs text-muted-foreground shrink-0">({group.items.length})</span>
                  </div>
                  {pendingItems.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-medium shrink-0">
                      <ShoppingBasket className="h-3.5 w-3.5" />
                      Commande en cours · {pendingItems.length} réf. · {Number(pendingUvc.toFixed(2))} UVC
                    </span>
                  )}
                </button>
                {!collapsed && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Unité</TableHead>
                        <TableHead>UVC</TableHead>
                        <TableHead className="text-right">Coût / unité</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead className="text-right">Statut</TableHead>
                        <TableHead className="w-44 text-center">Commander</TableHead>
                        <TableHead className="w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.items.map(ing => (
                        <TableRow key={ing.id}>
                          <TableCell className="font-medium">{ing.name}</TableCell>
                          <TableCell>{ing.unit}</TableCell>
                          <TableCell className="text-muted-foreground">{ing.uvc || '—'}</TableCell>
                          <TableCell className="text-right">{ing.cost_per_unit.toFixed(2)} €</TableCell>
                          <TableCell className="text-right">
                            {(() => {
                              const qty = Number(ing.stock_quantity ?? 0);
                              const uvcQty = Number(ing.uvc_quantity) || 0;
                              const uvcCount = uvcQty > 0 ? qty / uvcQty : 0;
                              return (
                                <div className="flex flex-col items-end leading-tight">
                                  <span className="font-medium">{qty} {ing.unit}</span>
                                  {uvcQty > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                      {Number(uvcCount.toFixed(3))} UVC
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ing.active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                              {ing.active ? 'Actif' : 'Inactif'}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {(() => {
                              const inCart = cartItems.find(ci => ci.ingredient.id === ing.id);
                              const draftRaw = qtyDraft[ing.id];
                              const draft = draftRaw !== undefined ? draftRaw : '1';
                              const addToCart = () => {
                                const qty = parseFloat(draft) || 0;
                                if (qty <= 0) { toast.error('Quantité invalide'); return; }
                                usePurchaseCartStore.getState().addItem({
                                  id: ing.id,
                                  name: ing.name,
                                  unit: ing.unit,
                                  cost_per_unit: ing.cost_per_unit,
                                  supplier: ing.supplier,
                                  supplier_id: ing.supplier_id,
                                  supplier_title: ing.supplier_ref?.title ?? null,
                                  uvc: ing.uvc,
                                  uvc_quantity: ing.uvc_quantity,
                                }, qty);
                                toast.success(`${ing.name}: +${qty} UVC ajouté(s)`);
                                setQtyDraft(prev => ({ ...prev, [ing.id]: '1' }));
                              };
                              return (
                                <div className="flex items-center justify-center gap-1.5">
                                  <Input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={draft}
                                    onChange={e => setQtyDraft(prev => ({ ...prev, [ing.id]: e.target.value }))}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addToCart(); } }}
                                    className="h-8 w-16 text-center text-sm"
                                    title="Quantité en UVC à ajouter"
                                  />
                                  <span className="text-[10px] text-muted-foreground">UVC</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-primary hover:bg-primary/10 relative"
                                    title="Ajouter au panier d'achat"
                                    onClick={addToCart}
                                  >
                                    <ShoppingBasket className="h-4 w-4" />
                                    {inCart && (
                                      <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-semibold h-4 min-w-4 px-1">
                                        {Number(inCart.quantity)}
                                      </span>
                                    )}
                                  </Button>
                                </div>
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditIng(ing)}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(ing.id)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier l\'ingrédient' : 'Nouvel ingrédient'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Nom</label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Unité de gestion</label>
                <Select value={form.unit} onValueChange={v => {
                  const newSub = v === 'kg' ? 'kg' : v === 'litre' ? 'litre' : 'unite';
                  setForm({ ...form, unit: v, uvc_piece_unit: newSub });
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="litre">litre</SelectItem>
                    <SelectItem value="unite">unité</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Stock</label>
                {(() => {
                  const uvcQty = parseFloat(form.uvc_pieces) * parseFloat(form.uvc_piece_qty);
                  const validUvc = isFinite(uvcQty) && uvcQty > 0;
                  const stockBase = parseFloat(form.stock_quantity) || 0;
                  const stockUvc = validUvc ? stockBase / uvcQty : 0;
                  return (
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder={form.unit}
                          value={form.stock_quantity}
                          onChange={e => setForm({ ...form, stock_quantity: e.target.value })}
                        />
                        <span className="text-[10px] text-muted-foreground">en {form.unit}</span>
                      </div>
                      <span className="text-muted-foreground text-xs pb-5">ou</span>
                      <div className="flex-1">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="UVC"
                          disabled={!validUvc}
                          value={validUvc ? Number(stockUvc.toFixed(3)) : ''}
                          onChange={e => {
                            const v = parseFloat(e.target.value) || 0;
                            setForm({ ...form, stock_quantity: String(v * uvcQty) });
                          }}
                        />
                        <span className="text-[10px] text-muted-foreground">en UVC</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="rounded-lg border border-border p-3 space-y-3 bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Conditionnement UVC</p>
              <div className="grid grid-cols-[1fr_auto_1fr_1fr] items-end gap-2">
                <div>
                  <label className="text-sm text-muted-foreground">Pièces</label>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="ex. 12"
                    value={form.uvc_pieces}
                    onChange={e => {
                      const pieces = e.target.value;
                      const totalQty = computeUvcTotalQty(pieces, form.uvc_piece_qty, form.unit, form.uvc_piece_unit);
                      const upNum = parseFloat(form.uvc_price);
                      setForm({
                        ...form,
                        uvc_pieces: pieces,
                        cost_per_unit: !isNaN(upNum) && totalQty > 0 ? (upNum / totalQty).toFixed(4) : form.cost_per_unit,
                      });
                    }}
                  />
                </div>
                <div className="pb-2 text-muted-foreground font-medium">×</div>
                <div>
                  <label className="text-sm text-muted-foreground">Quantité / pièce</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="ex. 500"
                    value={form.uvc_piece_qty}
                    onChange={e => {
                      const pieceQty = e.target.value;
                      const totalQty = computeUvcTotalQty(form.uvc_pieces, pieceQty, form.unit, form.uvc_piece_unit);
                      const upNum = parseFloat(form.uvc_price);
                      setForm({
                        ...form,
                        uvc_piece_qty: pieceQty,
                        cost_per_unit: !isNaN(upNum) && totalQty > 0 ? (upNum / totalQty).toFixed(4) : form.cost_per_unit,
                      });
                    }}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Unité</label>
                  <Select value={form.uvc_piece_unit} onValueChange={v => {
                    const totalQty = computeUvcTotalQty(form.uvc_pieces, form.uvc_piece_qty, form.unit, v);
                    const upNum = parseFloat(form.uvc_price);
                    setForm({
                      ...form,
                      uvc_piece_unit: v,
                      cost_per_unit: !isNaN(upNum) && totalQty > 0 ? (upNum / totalQty).toFixed(4) : form.cost_per_unit,
                    });
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {subUnitOptions(form.unit).map(u => (
                        <SelectItem key={u} value={u}>{u === 'unite' ? 'unité' : u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Total UVC : <span className="font-medium text-foreground">
                  {computeUvcTotalQty(form.uvc_pieces, form.uvc_piece_qty, form.unit, form.uvc_piece_unit).toFixed(3)} {form.unit === 'unite' ? 'unité' : form.unit}
                </span>
              </p>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                <div>
                  <label className="text-sm text-muted-foreground">Prix UVC (€)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.uvc_price}
                    onChange={e => {
                      const up = e.target.value;
                      const totalQty = computeUvcTotalQty(form.uvc_pieces, form.uvc_piece_qty, form.unit, form.uvc_piece_unit);
                      const upNum = parseFloat(up);
                      setForm({
                        ...form,
                        uvc_price: up,
                        cost_per_unit: !isNaN(upNum) && totalQty > 0 ? (upNum / totalQty).toFixed(4) : '',
                      });
                    }}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Prix / {form.unit === 'unite' ? 'unité' : form.unit} (€)</label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={form.cost_per_unit}
                    onChange={e => {
                      const cpu = e.target.value;
                      const totalQty = computeUvcTotalQty(form.uvc_pieces, form.uvc_piece_qty, form.unit, form.uvc_piece_unit);
                      const cpuNum = parseFloat(cpu);
                      setForm({
                        ...form,
                        cost_per_unit: cpu,
                        uvc_price: !isNaN(cpuNum) && totalQty > 0 ? (cpuNum * totalQty).toFixed(4) : '',
                      });
                    }}
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Fournisseur</label>
              <Select value={form.supplier_id || 'none'} onValueChange={v => setForm({ ...form, supplier_id: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un fournisseur" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Aucun —</SelectItem>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Annuler</Button>
            <Button onClick={handleSave}>{editing ? 'Mettre à jour' : 'Créer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ===== FOURNISSEURS TAB =====
type Supplier = {
  id: string;
  title: string;
  name: string | null;
  address: string | null;
  city: string | null;
  zip: string | null;
  country: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  active: boolean;
};

const emptySupplier = { title: '', name: '', address: '', city: '', zip: '', country: 'fr', phone: '', mobile: '', email: '' };

function FournisseursTab() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState<Supplier | null>(null);
  const [form, setForm] = useState(emptySupplier);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('suppliers').select('*').order('title');
    setSuppliers((data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = suppliers.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    (s.name && s.name.toLowerCase().includes(search.toLowerCase())) ||
    (s.email && s.email.toLowerCase().includes(search.toLowerCase()))
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptySupplier);
    setDialogOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({
      title: s.title, name: s.name || '', address: s.address || '',
      city: s.city || '', zip: s.zip || '', country: s.country || 'fr',
      phone: s.phone || '', mobile: s.mobile || '', email: s.email || '',
    });
    setDialogOpen(true);
  };

  const openDelete = (s: Supplier) => {
    setDeleting(s);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Le nom de société est requis'); return; }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      name: form.name.trim() || null,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      zip: form.zip.trim() || null,
      country: form.country.trim() || null,
      phone: form.phone.trim() || null,
      mobile: form.mobile.trim() || null,
      email: form.email.trim() || null,
    };
    if (editing) {
      const { error } = await supabase.from('suppliers').update(payload as any).eq('id', editing.id);
      if (error) toast.error('Erreur lors de la modification');
      else toast.success('Fournisseur modifié');
    } else {
      const { error } = await supabase.from('suppliers').insert(payload as any);
      if (error) toast.error('Erreur lors de la création');
      else toast.success('Fournisseur créé');
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase.from('suppliers').delete().eq('id', deleting.id);
    if (error) toast.error('Erreur lors de la suppression');
    else toast.success('Fournisseur supprimé');
    setDeleteDialogOpen(false);
    setDeleting(null);
    load();
  };

  const field = (label: string, key: keyof typeof form, type = 'text') => (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <Input type={type} value={form[key]} onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))} />
    </div>
  );

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">Fournisseurs</h2>
          <p className="text-sm text-muted-foreground">{suppliers.length} fournisseur{suppliers.length > 1 ? 's' : ''} enregistré{suppliers.length > 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button onClick={openCreate} className="gap-2 shrink-0"><Plus className="h-4 w-4" />Ajouter</Button>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-10">Chargement...</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <Truck className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-lg font-medium text-muted-foreground">Aucun fournisseur</p>
          <Button onClick={openCreate} variant="outline" className="mt-4 gap-2"><Plus className="h-4 w-4" />Ajouter un fournisseur</Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Société</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.title}</TableCell>
                  <TableCell>{s.name || '—'}</TableCell>
                  <TableCell>{s.phone || '—'}</TableCell>
                  <TableCell>{s.mobile || '—'}</TableCell>
                  <TableCell>{s.email || '—'}</TableCell>
                  <TableCell>{[s.zip, s.city].filter(Boolean).join(' ') || '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => openDelete(s)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {field('Société *', 'title')}
            <div className="grid grid-cols-2 gap-4">
              {field('Contact', 'name')}
              {field('Email', 'email', 'email')}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {field('Téléphone', 'phone', 'tel')}
              {field('Mobile', 'mobile', 'tel')}
            </div>
            {field('Adresse', 'address')}
            <div className="grid grid-cols-3 gap-4">
              {field('Code postal', 'zip')}
              {field('Ville', 'city')}
              {field('Pays', 'country')}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement...' : editing ? 'Modifier' : 'Créer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer le fournisseur</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Êtes-vous sûr de vouloir supprimer <strong>{deleting?.title}</strong> ? Cette action est irréversible.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ===== COMMANDES TAB =====
function CommandesTab({ recipes, ingredients, onRefresh }: { recipes: Recipe[]; ingredients: Ingredient[]; onRefresh: () => void }) {
  // Aggregate all ingredient needs across recipes
  const ingredientNeeds = recipes.reduce<Record<string, { ingredient: Ingredient; totalQty: number; unit: string; recipeCount: number }>>((acc, recipe) => {
    recipe.recipe_ingredients?.forEach(ri => {
      if (!ri.ingredient) return;
      if (!acc[ri.ingredient_id]) {
        acc[ri.ingredient_id] = { ingredient: ri.ingredient, totalQty: 0, unit: ri.unit, recipeCount: 0 };
      }
      acc[ri.ingredient_id].totalQty += ri.quantity;
      acc[ri.ingredient_id].recipeCount += 1;
    });
    return acc;
  }, {});

  const sorted = Object.values(ingredientNeeds).sort((a, b) => a.ingredient.name.localeCompare(b.ingredient.name));

  const totalEstimatedCost = sorted.reduce((sum, item) => sum + item.totalQty * item.ingredient.cost_per_unit, 0);

  const cartItems = usePurchaseCartStore(s => s.items);
  const updateQty = usePurchaseCartStore(s => s.updateQuantity);
  const removeItem = usePurchaseCartStore(s => s.removeItem);
  const clearCart = usePurchaseCartStore(s => s.clear);

  const [collapsedSuppliers, setCollapsedSuppliers] = useState<Record<string, boolean>>({});
  const toggleSupplier = (name: string) =>
    setCollapsedSuppliers(prev => ({ ...prev, [name]: !prev[name] }));

  // Group cart by supplier
  const cartBySupplier = cartItems.reduce<Record<string, PurchaseCartItem[]>>((acc, it) => {
    const sup = it.ingredient.supplier_title || it.ingredient.supplier || 'Sans fournisseur';
    if (!acc[sup]) acc[sup] = [];
    acc[sup].push(it);
    return acc;
  }, {});
  const cartSupNames = Object.keys(cartBySupplier).sort((a, b) =>
    a === 'Sans fournisseur' ? 1 : b === 'Sans fournisseur' ? -1 : a.localeCompare(b)
  );
  const cartTotal = cartItems.reduce(
    (s, i) => s + i.quantity * (Number(i.ingredient.uvc_quantity) || 1) * (Number(i.ingredient.cost_per_unit) || 0),
    0
  );

  // ----- Commandes passées -----
  type PastOrder = {
    id: string;
    supplier_label: string;
    total: number;
    validated_at: string | null;
    created_at: string;
    items: Array<{
      id: string;
      ingredient_name: string;
      uvc_label: string | null;
      uvc_quantity: number;
      quantity_uvc: number;
      unit: string;
      cost_per_unit: number;
    }>;
  };
  const [pastOrders, setPastOrders] = useState<PastOrder[]>([]);
  const [validating, setValidating] = useState<string | null>(null);
  const [expandedPast, setExpandedPast] = useState<Record<string, boolean>>({});

  const loadPastOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('id, supplier_label, total, validated_at, created_at, purchase_order_items(id, ingredient_name, uvc_label, uvc_quantity, quantity_uvc, unit, cost_per_unit)')
      .eq('status', 'completed')
      .order('validated_at', { ascending: false })
      .limit(50);
    if (error) {
      toast.error('Erreur chargement historique');
    } else if (data) {
      setPastOrders(
        data.map((o: any) => ({
          id: o.id,
          supplier_label: o.supplier_label,
          total: Number(o.total) || 0,
          validated_at: o.validated_at,
          created_at: o.created_at,
          items: (o.purchase_order_items || []).map((it: any) => ({
            id: it.id,
            ingredient_name: it.ingredient_name,
            uvc_label: it.uvc_label,
            uvc_quantity: Number(it.uvc_quantity) || 1,
            quantity_uvc: Number(it.quantity_uvc) || 0,
            unit: it.unit,
            cost_per_unit: Number(it.cost_per_unit) || 0,
          })),
        }))
      );
    }
  }, []);

  useEffect(() => {
    loadPastOrders();
  }, [loadPastOrders]);

  const handleValidateSupplier = async (supName: string) => {
    const items = cartBySupplier[supName];
    if (!items || items.length === 0) return;
    setValidating(supName);
    try {
      const supplierId = items[0].ingredient.supplier_id;
      const supTotal = items.reduce(
        (s, i) => s + i.quantity * (Number(i.ingredient.uvc_quantity) || 1) * (Number(i.ingredient.cost_per_unit) || 0),
        0
      );
      const { data: order, error: orderErr } = await supabase
        .from('purchase_orders')
        .insert({ supplier_label: supName, supplier_id: supplierId, total: supTotal, status: 'pending' })
        .select()
        .single();
      if (orderErr || !order) throw orderErr || new Error('Création commande échouée');

      const itemsPayload = items.map(it => ({
        purchase_order_id: order.id,
        ingredient_id: it.ingredient.id,
        ingredient_name: it.ingredient.name,
        uvc_label: it.ingredient.uvc,
        uvc_quantity: Number(it.ingredient.uvc_quantity) || 1,
        quantity_uvc: it.quantity,
        unit: it.ingredient.unit,
        cost_per_unit: Number(it.ingredient.cost_per_unit) || 0,
      }));
      const { error: itemsErr } = await supabase.from('purchase_order_items').insert(itemsPayload);
      if (itemsErr) throw itemsErr;

      const { error: validErr } = await supabase.rpc('validate_purchase_order', { _order_id: order.id });
      if (validErr) throw validErr;

      items.forEach(it => removeItem(it.ingredient.id));
      toast.success(`Commande ${supName} validée — stocks mis à jour`);
      loadPastOrders();
      onRefresh();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Erreur validation commande');
    } finally {
      setValidating(null);
    }
  };

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">Commandes fournisseurs</h2>
          <p className="text-sm text-muted-foreground">Commande en cours et récapitulatif des besoins basé sur vos fiches techniques</p>
        </div>
      </div>

      {/* ===== COMMANDE EN COURS (panier manuel) ===== */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
            <ShoppingBasket className="h-5 w-5 text-primary" />
            Commande en cours
            {cartItems.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground">({cartItems.length} ingrédient{cartItems.length > 1 ? 's' : ''})</span>
            )}
          </h3>
          {cartItems.length > 0 && (
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { clearCart(); toast.success('Commande vidée'); }}>
              <Trash2 className="h-4 w-4 mr-1" />Vider
            </Button>
          )}
        </div>

        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
            <ShoppingBasket className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Aucun ingrédient dans la commande</p>
            <p className="mt-1 text-xs text-muted-foreground/70">Ajoutez-en depuis l'onglet Ingrédients via le bouton panier</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cartSupNames.map(supName => {
              const items = cartBySupplier[supName];
              const supTotal = items.reduce(
                (s, i) => s + i.quantity * (Number(i.ingredient.uvc_quantity) || 1) * (Number(i.ingredient.cost_per_unit) || 0),
                0
              );
              return (
                <div key={supName} className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 border-b border-border gap-3">
                    <button
                      type="button"
                      onClick={() => toggleSupplier(supName)}
                      className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left flex-1 min-w-0"
                    >
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform ${collapsedSuppliers[supName] ? '-rotate-90' : ''}`}
                      />
                      <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-semibold text-foreground truncate">{supName}</span>
                      <span className="text-xs text-muted-foreground shrink-0">({items.length})</span>
                    </button>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-medium text-foreground">{supTotal.toFixed(2)} €</span>
                      <Button
                        size="sm"
                        onClick={() => handleValidateSupplier(supName)}
                        disabled={validating === supName}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        {validating === supName ? 'Validation...' : 'Valider'}
                      </Button>
                    </div>
                  </div>
                  {!collapsedSuppliers[supName] && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ingrédient</TableHead>
                        <TableHead>UVC</TableHead>
                        <TableHead className="text-center w-40">Quantité</TableHead>
                        <TableHead className="text-right">Sous-total</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map(it => {
                        const lineTotal = it.quantity * (Number(it.ingredient.uvc_quantity) || 1) * (Number(it.ingredient.cost_per_unit) || 0);
                        return (
                          <TableRow key={it.ingredient.id}>
                            <TableCell className="font-medium">{it.ingredient.name}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{it.ingredient.uvc || '—'}</TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(it.ingredient.id, it.quantity - 1)}>
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                  type="number"
                                  min="0"
                                  value={it.quantity}
                                  onChange={(e) => updateQty(it.ingredient.id, parseInt(e.target.value) || 0)}
                                  className="h-7 w-14 text-center text-sm"
                                />
                                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(it.ingredient.id, it.quantity + 1)}>
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">{lineTotal.toFixed(2)} €</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(it.ingredient.id)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  )}
                </div>
              );
            })}
            <div className="flex items-center justify-end gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/20">
              <span className="text-sm text-muted-foreground">Total commande :</span>
              <span className="text-lg font-bold text-foreground">{cartTotal.toFixed(2)} €</span>
            </div>
          </div>
        )}
      </section>

      {/* ===== COMMANDES PASSÉES ===== */}
      <section className="mb-10">
        <h3 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2 mb-3">
          <History className="h-5 w-5 text-primary" />
          Commandes passées
          {pastOrders.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground">({pastOrders.length})</span>
          )}
        </h3>

        {pastOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
            <History className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Aucune commande passée</p>
            <p className="mt-1 text-xs text-muted-foreground/70">Validez une commande en cours pour voir l'historique ici</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pastOrders.map(po => {
              const isOpen = !!expandedPast[po.id];
              const date = po.validated_at ? new Date(po.validated_at) : new Date(po.created_at);
              return (
                <div key={po.id} className="rounded-xl border border-border bg-card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedPast(prev => ({ ...prev, [po.id]: !prev[po.id] }))}
                    className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left gap-3"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${isOpen ? '' : '-rotate-90'}`}
                      />
                      <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-semibold text-foreground truncate">{po.supplier_label}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">· {po.items.length} ligne{po.items.length > 1 ? 's' : ''}</span>
                    </div>
                    <span className="text-sm font-medium text-foreground shrink-0">{po.total.toFixed(2)} €</span>
                  </button>
                  {isOpen && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ingrédient</TableHead>
                          <TableHead>UVC</TableHead>
                          <TableHead className="text-right">Qté UVC</TableHead>
                          <TableHead className="text-right">Qté totale</TableHead>
                          <TableHead className="text-right">Sous-total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {po.items.map(it => {
                          const baseQty = it.quantity_uvc * it.uvc_quantity;
                          const lineTotal = baseQty * it.cost_per_unit;
                          return (
                            <TableRow key={it.id}>
                              <TableCell className="font-medium">{it.ingredient_name}</TableCell>
                              <TableCell className="text-muted-foreground text-sm">{it.uvc_label || '—'}</TableCell>
                              <TableCell className="text-right">{it.quantity_uvc}</TableCell>
                              <TableCell className="text-right">{baseQty.toFixed(2)} {it.unit}</TableCell>
                              <TableCell className="text-right font-medium">{lineTotal.toFixed(2)} €</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

// ===== STOCK TAB =====
function StockTab({ ingredients, onRefresh, onOpenIngredient }: { ingredients: Ingredient[]; onRefresh: () => void; onOpenIngredient?: (id: string) => void }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = ingredients.filter(i =>
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (i.supplier || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStock = filtered.filter(i => (i as any).stock_min > 0 && (i as any).stock_quantity <= (i as any).stock_min);
  const okStock = filtered.filter(i => !((i as any).stock_min > 0 && (i as any).stock_quantity <= (i as any).stock_min));

  const handleUpdateStock = async (id: string, qty: number) => {
    const { error } = await supabase.from('ingredients').update({ stock_quantity: qty } as any).eq('id', id);
    if (error) { toast.error('Erreur mise à jour stock'); return; }
    onRefresh();
  };

  const handleUpdateMin = async (id: string, min: number) => {
    const { error } = await supabase.from('ingredients').update({ stock_min: min } as any).eq('id', id);
    if (error) { toast.error('Erreur mise à jour seuil'); return; }
    onRefresh();
  };

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">Stock ingrédients</h2>
          <p className="text-sm text-muted-foreground">Suivez les quantités en stock et les seuils d'alerte</p>
        </div>
      </div>

      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
      </div>

      {lowStock.length > 0 && (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <h3 className="font-semibold text-destructive mb-2 flex items-center gap-2">
            <Warehouse className="h-4 w-4" />Stock bas — {lowStock.length} ingrédient{lowStock.length > 1 ? 's' : ''}
          </h3>
          <div className="flex flex-wrap gap-2">
            {lowStock.map(ing => (
              <span key={ing.id} className="inline-flex items-center rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
                {ing.name} — {(ing as any).stock_quantity} {ing.unit}
              </span>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <Warehouse className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-lg font-medium text-muted-foreground">Aucun ingrédient</p>
        </div>
      ) : (() => {
        const grouped = filtered.reduce<Record<string, Ingredient[]>>((acc, ing) => {
          const key = ing.supplier_ref?.title || ing.supplier || 'Sans fournisseur';
          if (!acc[key]) acc[key] = [];
          acc[key].push(ing);
          return acc;
        }, {});
        const sortedSuppliers = Object.keys(grouped).sort((a, b) =>
          a === 'Sans fournisseur' ? 1 : b === 'Sans fournisseur' ? -1 : a.localeCompare(b)
        );
        return (
          <div className="space-y-6">
            {sortedSuppliers.map(supplierName => (
              <section key={supplierName}>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-heading text-base font-semibold text-foreground flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    {supplierName}
                  </h3>
                  <span className="text-xs text-muted-foreground">{grouped[supplierName].length} ingrédient{grouped[supplierName].length > 1 ? 's' : ''}</span>
                </div>
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ingrédient</TableHead>
                        <TableHead>UVC</TableHead>
                        <TableHead className="text-right">En stock</TableHead>
                        <TableHead className="text-right">Seuil min</TableHead>
                        <TableHead className="text-right">Statut</TableHead>
                        <TableHead className="w-56 text-right">Mise à jour</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {grouped[supplierName].map(ing => {
                        const qty = Number((ing as any).stock_quantity ?? 0);
                        const min = (ing as any).stock_min ?? 0;
                        const isLow = min > 0 && qty <= min;
                        const uvcQty = Number(ing.uvc_quantity) || 0;
                        const uvcCount = uvcQty > 0 ? qty / uvcQty : 0;
                        return (
                          <TableRow key={ing.id} className={isLow ? 'bg-destructive/5' : ''}>
                            <TableCell
                              className="font-medium cursor-pointer hover:text-primary select-none"
                              onDoubleClick={() => onOpenIngredient?.(ing.id)}
                              title="Double-clic pour ouvrir la fiche ingrédient"
                            >
                              {ing.name}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{ing.uvc || '—'}</TableCell>
                            <TableCell className="text-right font-medium">{qty} {ing.unit}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{min > 0 ? `${min} ${ing.unit}` : '—'}</TableCell>
                            <TableCell className="text-right">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${isLow ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                                {isLow ? 'Bas' : 'OK'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1">
                                <div className="flex flex-col items-end">
                                  <span className="text-[10px] text-muted-foreground leading-none mb-0.5">UVC</span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    disabled={uvcQty <= 0}
                                    className="h-8 w-20"
                                    value={uvcQty > 0 ? Number(uvcCount.toFixed(3)) : ''}
                                    onChange={e => {
                                      const v = parseFloat(e.target.value) || 0;
                                      handleUpdateStock(ing.id, v * uvcQty);
                                    }}
                                  />
                                </div>
                                <div className="flex flex-col items-end">
                                  <span className="text-[10px] text-muted-foreground leading-none mb-0.5">{ing.unit}</span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    className="h-8 w-24"
                                    value={qty}
                                    onChange={e => handleUpdateStock(ing.id, parseFloat(e.target.value) || 0)}
                                  />
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </section>
            ))}
          </div>
        );
      })()}
    </>
  );
}

// ---- Sub-components ----

function RecipeCard({ recipe, totalCost, onView, onEdit, onDelete }: { recipe: Recipe; totalCost: number; onView: () => void; onEdit: () => void; onDelete: () => void }) {
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
          <Euro className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium text-foreground">{totalCost.toFixed(2)} €</span>
          <span className="text-muted-foreground">/ {recipe.yield_quantity} {recipe.yield_unit}</span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onView}><Eye className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
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
                    <TableCell className="text-right">{((ri.ingredient?.cost_per_unit || 0) * convertToBaseUnit(ri.quantity, ri.unit, ri.ingredient?.unit)).toFixed(2)} €</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun ingrédient ajouté</p>
          )}
        </section>

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
            <label className="text-xs text-muted-foreground">Image</label>
            <ImageUpload value={recipe.image_url || recipe.product?.image_url || ''} onChange={(url: string) => setRecipe({ ...recipe, image_url: url })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Notes</label>
            <Textarea value={recipe.notes || ''} onChange={e => setRecipe({ ...recipe, notes: e.target.value })} rows={3} />
          </div>
        </section>

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
              {recipeIngredients.map((ri, idx) => {
                const ing = allIngredients.find(i => i.id === ri.ingredient_id);
                const baseQty = convertToBaseUnit(ri.quantity || 0, ri.unit, ing?.unit);
                const cost = (ing?.cost_per_unit || 0) * baseQty;
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <Select value={ri.ingredient_id} onValueChange={v => {
                      const updated = [...recipeIngredients];
                      const newIng = allIngredients.find(i => i.id === v);
                      updated[idx] = { ...updated[idx], ingredient_id: v, unit: newIng?.unit || ri.unit };
                      setRecipeIngredients(updated);
                    }}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Ingrédient" /></SelectTrigger>
                      <SelectContent>
                        {allIngredients.map(i => (
                          <SelectItem key={i.id} value={i.id}>{i.is_super ? '⭐ ' : ''}{i.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input type="number" step="0.001" className="w-24" placeholder="Qté" value={ri.quantity || ''} onChange={e => {
                      const updated = [...recipeIngredients];
                      updated[idx] = { ...updated[idx], quantity: parseFloat(e.target.value) || 0 };
                      setRecipeIngredients(updated);
                    }} />
                    <Select value={ri.unit} onValueChange={v => {
                      const updated = [...recipeIngredients];
                      updated[idx] = { ...updated[idx], unit: v };
                      setRecipeIngredients(updated);
                    }}>
                      <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {UNIT_OPTIONS.map(u => (
                          <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="w-24 text-right text-sm font-medium tabular-nums text-foreground">
                      {cost.toFixed(2)} €
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveIngredientRow(idx)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
              <div className="flex items-center justify-end gap-2 border-t border-border pt-3 mt-2 text-sm font-semibold">
                <span className="text-muted-foreground">Coût total :</span>
                <span className="w-24 text-right tabular-nums">
                  {recipeIngredients.reduce((sum, ri) => {
                    const ing = allIngredients.find(i => i.id === ri.ingredient_id);
                    const baseQty = convertToBaseUnit(ri.quantity || 0, ri.unit, ing?.unit);
                    return sum + (ing?.cost_per_unit || 0) * baseQty;
                  }, 0).toFixed(2)} €
                </span>
                <span className="w-8" />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun ingrédient — cliquez "Ajouter"</p>
          )}
        </section>

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

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>Annuler</Button>
          <Button onClick={onSave}>Sauvegarder</Button>
        </div>

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
