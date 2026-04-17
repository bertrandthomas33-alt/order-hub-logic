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

interface EditProductDialogProps {
  product: any | null;
  categories: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function EditProductDialog({ product, categories, open, onOpenChange, onSaved }: EditProductDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [price, setPrice] = useState('');
  const [priceB2c, setPriceB2c] = useState('');
  const [unit, setUnit] = useState('kg');
  const [warehouseId, setWarehouseId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [active, setActive] = useState(true);
  const [imageUrl, setImageUrl] = useState('');
  const [stock, setStock] = useState('');
  const [saving, setSaving] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);

  // Derive unique warehouses from categories
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

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setDescription(product.description || '');
      setCostPrice(String(product.cost_price ?? '0'));
      setPrice(String(product.price ?? ''));
      setPriceB2c(String(product.price_b2c ?? ''));
      setUnit(product.unit || 'kg');
      setCategoryId(product.category_id || '');
      setActive(product.active ?? true);
      setImageUrl(product.image_url || '');
      setStock(String(product.stock ?? '0'));
      // Set warehouse from the product's category
      const cat = categories.find((c: any) => c.id === product.category_id);
      setWarehouseId(cat?.warehouse_id || cat?.warehouses?.id || '');
    }
  }, [product, categories]);

  const handleSave = async () => {
    if (!name.trim() || !categoryId || !price) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('products')
      .update({
        name: name.trim(),
        description: description.trim() || null,
        cost_price: Number(costPrice) || 0,
        price: Number(price),
        price_b2c: Number(priceB2c) || 0,
        unit,
        category_id: categoryId,
        active,
        image_url: imageUrl.trim() || null,
        stock: Number(stock) || 0,
      })
      .eq('id', product.id);

    setSaving(false);
    if (error) {
      toast.error('Erreur lors de la sauvegarde');
      console.error(error);
    } else {
      toast.success('Produit mis à jour');
      onOpenChange(false);
      onSaved();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Modifier le produit</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 overflow-y-auto flex-1 pr-2">
          <div className="grid gap-2">
            <Label htmlFor="edit-name">Nom *</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-desc">Description</Label>
            <Textarea id="edit-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid gap-2">
            <Label>Image</Label>
            <ImageUpload value={imageUrl} onChange={setImageUrl} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-cost-price">Prix de revient (€)</Label>
              <Input id="edit-cost-price" type="number" step="0.01" min="0" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-price">Prix BtoB (€) *</Label>
              <Input id="edit-price" type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-price-b2c">Prix BtoC (€)</Label>
              <Input id="edit-price-b2c" type="number" step="0.01" min="0" value={priceB2c} onChange={(e) => setPriceB2c(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-stock">Stock</Label>
              <Input id="edit-stock" type="number" step="0.1" min="0" value={stock} onChange={(e) => setStock(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-unit">Unité</Label>
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
                // Reset category if it doesn't belong to new warehouse
                const cat = categories.find((c: any) => c.id === categoryId);
                if (cat && (cat.warehouse_id || cat.warehouses?.id) !== val) {
                  setCategoryId('');
                }
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
            <Switch id="edit-active" checked={active} onCheckedChange={setActive} />
            <Label htmlFor="edit-active">Produit actif</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
