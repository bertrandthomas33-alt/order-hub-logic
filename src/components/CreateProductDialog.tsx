import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ImageUpload';

interface CreateProductDialogProps {
  categories: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateProductDialog({ categories, open, onOpenChange, onCreated }: CreateProductDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('kg');
  const [warehouseId, setWarehouseId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [active, setActive] = useState(true);
  const [imageUrl, setImageUrl] = useState('');
  const [stock, setStock] = useState('0');
  const [saving, setSaving] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);

  useEffect(() => {
    const whMap = new Map<string, any>();
    categories.forEach((cat: any) => {
      if (cat.warehouses && !whMap.has(cat.warehouses.id)) {
        whMap.set(cat.warehouses.id, cat.warehouses);
      }
      if (cat.warehouse_id && !cat.warehouses && !whMap.has(cat.warehouse_id)) {
        whMap.set(cat.warehouse_id, { id: cat.warehouse_id, name: cat.warehouse_id });
      }
    });
    setWarehouses(Array.from(whMap.values()));
  }, [categories]);

  const filteredCategories = warehouseId
    ? categories.filter((cat: any) => (cat.warehouse_id || cat.warehouses?.id) === warehouseId)
    : categories;

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName(''); setDescription(''); setCostPrice(''); setPrice(''); setUnit('kg');
      setWarehouseId(''); setCategoryId(''); setActive(true);
      setImageUrl(''); setStock('0');
    }
  }, [open]);

  const handleSave = async () => {
    if (!name.trim() || !categoryId || !price) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('products').insert({
      name: name.trim(),
      description: description.trim() || null,
      cost_price: Number(costPrice) || 0,
      price: Number(price),
      unit,
      category_id: categoryId,
      active,
      image_url: imageUrl.trim() || null,
      stock: Number(stock) || 0,
    });
    setSaving(false);
    if (error) {
      toast.error('Erreur lors de la création');
      console.error(error);
    } else {
      toast.success('Produit créé');
      onOpenChange(false);
      onCreated();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau produit</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="new-name">Nom *</Label>
            <Input id="new-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-desc">Description</Label>
            <Textarea id="new-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid gap-2">
            <Label>Image</Label>
            <ImageUpload value={imageUrl} onChange={setImageUrl} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="new-cost-price">Prix de revient (€)</Label>
              <Input id="new-cost-price" type="number" step="0.01" min="0" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-price">Prix de vente (€) *</Label>
              <Input id="new-price" type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="new-stock">Stock</Label>
              <Input id="new-stock" type="number" step="0.1" min="0" value={stock} onChange={(e) => setStock(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Unité</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="pièce">pièce</SelectItem>
                  <SelectItem value="litre">litre</SelectItem>
                  <SelectItem value="barquette">barquette</SelectItem>
                  <SelectItem value="sachet">sachet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Entrepôt *</Label>
              <Select value={warehouseId} onValueChange={(val) => {
                setWarehouseId(val);
                const cat = categories.find((c: any) => c.id === categoryId);
                if (cat && (cat.warehouse_id || cat.warehouses?.id) !== val) setCategoryId('');
              }}>
                <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>
                  {warehouses.map((wh: any) => (
                    <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Catégorie *</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
              <SelectContent>
                {filteredCategories.map((cat: any) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <Switch id="new-active" checked={active} onCheckedChange={setActive} />
            <Label htmlFor="new-active">Produit actif</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Création…' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
