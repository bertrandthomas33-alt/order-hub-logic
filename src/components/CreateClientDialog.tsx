import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const createClientSchema = z.object({
  name: z.string().min(1).max(255),
  contact: z.string().min(1).max(255),
  address: z.string().min(1).max(500),
  email: z.string().email().max(255),
  password: z.string().min(6).max(128),
  phone: z.string().max(30).optional(),
});

async function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'context' in error) {
    const response = (error as { context?: Response }).context;

    if (response) {
      try {
        const payload = await response.clone().json() as { error?: string };
        if (payload?.error) return payload.error;
      } catch {
        try {
          const text = await response.clone().text();
          if (text) return text;
        } catch {
          // noop
        }
      }
    }
  }

  if (error instanceof Error && error.message) return error.message;
  return 'Erreur lors de la création';
}

interface CreateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateClientDialog({ open, onOpenChange, onCreated }: CreateClientDialogProps) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = createClientSchema.safeParse({
      name,
      contact,
      address,
      email,
      password,
      phone: phone || undefined,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Veuillez vérifier les champs saisis');
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Session expirée. Reconnectez-vous.');
      }

      const { error } = await supabase.functions.invoke('create-client', {
        body: parsed.data,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast.success('Client créé avec succès !', { description: `${name} — ${email}` });
      onOpenChange(false);
      resetForm();
      onCreated();
    } catch (err) {
      toast.error(await getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setName(''); setContact(''); setAddress(''); setEmail(''); setPassword(''); setPhone('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau client</DialogTitle>
          <DialogDescription>Créez un point de vente avec son compte de connexion</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Raison sociale *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Boulangerie Martin" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact">Nom du responsable *</Label>
            <Input id="contact" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Ex: Jean Martin" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Adresse de livraison *</Label>
            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Ex: 12 rue de la Paix, 75001 Paris" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ex: 01 23 45 67 89" />
          </div>
          <div className="border-t border-border pt-4">
            <p className="mb-3 text-sm font-medium text-muted-foreground">Identifiants de connexion</p>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="email">Email (login) *</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@exemple.fr" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe *</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 6 caractères" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Création...' : 'Créer le client'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
