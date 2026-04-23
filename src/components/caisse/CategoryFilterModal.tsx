import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Settings } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Props {
  allCategories: string[];
  excludedCategories: string[];
  onExcludedCategoriesChange: (excluded: string[]) => void;
}

export const CategoryFilterModal = ({
  allCategories,
  excludedCategories,
  onExcludedCategoriesChange,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [localExcluded, setLocalExcluded] = useState<string[]>(excludedCategories);

  useEffect(() => {
    setLocalExcluded(excludedCategories);
  }, [excludedCategories]);

  const toggle = (c: string) =>
    setLocalExcluded((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );

  const save = () => {
    onExcludedCategoriesChange(localExcluded);
    if (typeof window !== 'undefined') {
      localStorage.setItem('caisse_excluded_categories', JSON.stringify(localExcluded));
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-400 hover:text-white hover:bg-gray-700"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Catégories à masquer</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocalExcluded([])}
            className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
          >
            Tout afficher
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocalExcluded([...allCategories])}
            className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
          >
            Tout masquer
          </Button>
        </div>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {allCategories.sort().map((c) => (
              <div
                key={c}
                className="flex items-center space-x-3 p-2 rounded hover:bg-gray-700 cursor-pointer"
                onClick={() => toggle(c)}
              >
                <Checkbox
                  id={c}
                  checked={localExcluded.includes(c)}
                  onCheckedChange={() => toggle(c)}
                  className="border-gray-500 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                />
                <label
                  htmlFor={c}
                  className={`text-sm cursor-pointer flex-1 ${
                    localExcluded.includes(c) ? 'text-gray-500 line-through' : 'text-white'
                  }`}
                >
                  {c}
                </label>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
          >
            Annuler
          </Button>
          <Button onClick={save} className="bg-green-600 hover:bg-green-700">
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
