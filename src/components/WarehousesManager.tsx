import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Pencil, Check, X, ChevronDown, ChevronRight, Warehouse } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface Props {
  warehouses: any[];
  categories: any[];
  onRefresh: () => void;
}

export function WarehousesManager({ warehouses, categories, onRefresh }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showAddWarehouse, setShowAddWarehouse] = useState(false);
  const [newWhName, setNewWhName] = useState('');
  const [editWh, setEditWh] = useState<any>(null);
  const [editWhName, setEditWhName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [editCat, setEditCat] = useState<any>(null);
  const [editCatName, setEditCatName] = useState('');
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const addWarehouse = async () => {
    if (!newWhName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('warehouses').insert({ name: newWhName.trim() });
    setSaving(false);
    if (error) { toast.error('Erreur'); console.error(error); }
    else { toast.success('Entrepôt ajouté'); setShowAddWarehouse(false); setNewWhName(''); onRefresh(); }
  };

  const updateWarehouse = async () => {
    if (!editWhName.trim() || !editWh) return;
    setSaving(true);
    const { error } = await supabase.from('warehouses').update({ name: editWhName.trim() }).eq('id', editWh.id);
    setSaving(false);
    if (error) { toast.error('Erreur'); } 
    else { toast.success('Entrepôt renommé'); setEditWh(null); onRefresh(); }
  };

  const deleteWarehouse = async (wh: any) => {
    const cats = categories.filter(c => c.warehouse_id === wh.id);
    if (cats.length > 0) { toast.error('Supprimez d\'abord les catégories de cet entrepôt'); return; }
    const { error } = await supabase.from('warehouses').delete().eq('id', wh.id);
    if (error) { toast.error('Erreur'); } 
    else { toast.success('Entrepôt supprimé'); onRefresh(); }
  };

  const addCategory = async (warehouseId: string) => {
    if (!newCatName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('categories').insert({ name: newCatName.trim(), warehouse_id: warehouseId });
    setSaving(false);
    if (error) { toast.error('Erreur'); console.error(error); }
    else { toast.success('Catégorie ajoutée'); setShowAddCategory(null); setNewCatName(''); onRefresh(); }
  };

  const updateCategory = async () => {
    if (!editCatName.trim() || !editCat) return;
    setSaving(true);
    const { error } = await supabase.from('categories').update({ name: editCatName.trim() }).eq('id', editCat.id);
    setSaving(false);
    if (error) { toast.error('Erreur'); }
    else { toast.success('Catégorie renommée'); setEditCat(null); onRefresh(); }
  };

  const deleteCategory = async (cat: any) => {
    const { error } = await supabase.from('categories').delete().eq('id', cat.id);
    if (error) { toast.error('Impossible de supprimer (des produits y sont liés ?)'); console.error(error); }
    else { toast.success('Catégorie supprimée'); onRefresh(); }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{warehouses.length} entrepôt(s)</span>
        <Button className="gap-2" onClick={() => setShowAddWarehouse(true)}>
          <Plus className="h-4 w-4" />
          Nouvel entrepôt
        </Button>
      </div>

      <div className="space-y-3">
        {warehouses.map(wh => {
          const whCats = categories.filter(c => c.warehouse_id === wh.id);
          const isOpen = expanded.has(wh.id);
          return (
            <div key={wh.id} className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 cursor-pointer" onClick={() => toggle(wh.id)}>
                {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                <Warehouse className="h-5 w-5 text-primary" />
                <span className="font-medium text-foreground flex-1">{wh.name}</span>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs">{whCats.length} catégorie(s)</span>
                <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); setEditWh(wh); setEditWhName(wh.name); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); deleteWarehouse(wh); }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              {isOpen && (
                <div className="border-t border-border px-5 py-3">
                  {whCats.length === 0 && <p className="text-sm text-muted-foreground py-2">Aucune catégorie</p>}
                  <div className="space-y-1">
                    {whCats.map(cat => (
                      <div key={cat.id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/50">
                        <span className="flex-1 text-sm">{cat.name}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditCat(cat); setEditCatName(cat.name); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteCategory(cat)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={() => { setShowAddCategory(wh.id); setNewCatName(''); }}>
                    <Plus className="h-3.5 w-3.5" />
                    Ajouter une catégorie
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add warehouse dialog */}
      <Dialog open={showAddWarehouse} onOpenChange={setShowAddWarehouse}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Nouvel entrepôt</DialogTitle></DialogHeader>
          <div className="grid gap-2 py-4">
            <Label>Nom</Label>
            <Input value={newWhName} onChange={e => setNewWhName(e.target.value)} placeholder="Ex: Frais, Surgelé..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddWarehouse(false)}>Annuler</Button>
            <Button onClick={addWarehouse} disabled={saving || !newWhName.trim()}>{saving ? 'Ajout…' : 'Ajouter'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit warehouse dialog */}
      <Dialog open={!!editWh} onOpenChange={open => { if (!open) setEditWh(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Renommer l'entrepôt</DialogTitle></DialogHeader>
          <div className="grid gap-2 py-4">
            <Label>Nom</Label>
            <Input value={editWhName} onChange={e => setEditWhName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditWh(null)}>Annuler</Button>
            <Button onClick={updateWarehouse} disabled={saving || !editWhName.trim()}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add category dialog */}
      <Dialog open={!!showAddCategory} onOpenChange={open => { if (!open) setShowAddCategory(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Nouvelle catégorie</DialogTitle></DialogHeader>
          <div className="grid gap-2 py-4">
            <Label>Nom</Label>
            <Input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Ex: Antipasti, Soupes..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCategory(null)}>Annuler</Button>
            <Button onClick={() => showAddCategory && addCategory(showAddCategory)} disabled={saving || !newCatName.trim()}>{saving ? 'Ajout…' : 'Ajouter'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit category dialog */}
      <Dialog open={!!editCat} onOpenChange={open => { if (!open) setEditCat(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Renommer la catégorie</DialogTitle></DialogHeader>
          <div className="grid gap-2 py-4">
            <Label>Nom</Label>
            <Input value={editCatName} onChange={e => setEditCatName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCat(null)}>Annuler</Button>
            <Button onClick={updateCategory} disabled={saving || !editCatName.trim()}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
