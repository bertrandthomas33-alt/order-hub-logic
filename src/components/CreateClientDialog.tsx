import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { createServerFn } from '@tanstack/react-start';
import { useServerFn } from '@tanstack/react-start';
import { z } from 'zod';

const createClientSchema = z.object({
  name: z.string().min(1).max(255),
  contact: z.string().min(1).max(255),
  address: z.string().min(1).max(500),
  email: z.string().email().max(255),
  password: z.string().min(6).max(128),
  phone: z.string().max(30).optional(),
});

const createClientFn = createServerFn({ method: 'POST' })
  .inputValidator((input: z.infer<typeof createClientSchema>) => createClientSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

    // 1. Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      throw new Error(authError?.message || 'Erreur création utilisateur');
    }

    const userId = authData.user.id;

    // 2. Assign 'pdv' role
    const { error: roleError } = await supabaseAdmin.from('user_roles').insert({
      user_id: userId,
      role: 'pdv',
    });

    if (roleError) {
      // Cleanup: delete user if role assignment fails
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error('Erreur assignation rôle: ' + roleError.message);
    }

    // 3. Create client record
    const { error: clientError } = await supabaseAdmin.from('clients').insert({
      user_id: userId,
      name: data.name,
      contact: data.contact,
      address: data.address,
      email: data.email,
      phone: data.phone || null,
      active: true,
    });

    if (clientError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error('Erreur création client: ' + clientError.message);
    }

    return { success: true };
  });

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

  const createClient = useServerFn(createClientFn);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !contact || !address || !email || !password) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    if (password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setSaving(true);
    try {
      await createClient({
        data: { name, contact, address, email, password, phone: phone || undefined },
      });
      toast.success('Client créé avec succès !', { description: `${name} — ${email}` });
      onOpenChange(false);
      resetForm();
      onCreated();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création');
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
