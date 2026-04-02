import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Trash2 } from 'lucide-react';

export interface VariantOption {
  name: string;
  values: string[];
}

interface VariantMatrixProps {
  category: string | null;
  options: VariantOption[];
  onChange: (options: VariantOption[]) => void;
}

const CATEGORY_PRESETS: Record<string, VariantOption[]> = {
  Fashion: [
    { name: 'Size', values: ['S', 'M', 'L', 'XL', 'XXL'] },
    { name: 'Color', values: [] },
  ],
  Food: [
    { name: 'Weight', values: ['250g', '500g', '1kg'] },
    { name: 'Type', values: [] },
  ],
  Electronics: [
    { name: 'Storage', values: ['64GB', '128GB', '256GB'] },
    { name: 'Color', values: [] },
  ],
  Beauty: [
    { name: 'Size', values: ['50ml', '100ml', '200ml'] },
    { name: 'Shade', values: [] },
  ],
};

const VariantMatrix = ({ category, options, onChange }: VariantMatrixProps) => {
  const [newValue, setNewValue] = useState<Record<number, string>>({});

  const loadPreset = () => {
    const preset = CATEGORY_PRESETS[category || ''];
    if (preset) onChange(preset);
  };

  const addOption = () => {
    onChange([...options, { name: '', values: [] }]);
  };

  const removeOption = (index: number) => {
    onChange(options.filter((_, i) => i !== index));
  };

  const updateOptionName = (index: number, name: string) => {
    const updated = [...options];
    updated[index] = { ...updated[index], name };
    onChange(updated);
  };

  const addValue = (optionIndex: number) => {
    const val = (newValue[optionIndex] || '').trim();
    if (!val) return;
    const updated = [...options];
    if (!updated[optionIndex].values.includes(val)) {
      updated[optionIndex] = {
        ...updated[optionIndex],
        values: [...updated[optionIndex].values, val],
      };
      onChange(updated);
    }
    setNewValue({ ...newValue, [optionIndex]: '' });
  };

  const removeValue = (optionIndex: number, valueIndex: number) => {
    const updated = [...options];
    updated[optionIndex] = {
      ...updated[optionIndex],
      values: updated[optionIndex].values.filter((_, i) => i !== valueIndex),
    };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Variants</h4>
        <div className="flex gap-2">
          {category && CATEGORY_PRESETS[category] && (
            <Button type="button" variant="outline" size="sm" onClick={loadPreset}>
              Load {category} Preset
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={addOption}>
            <Plus className="mr-1 h-3 w-3" /> Add Option
          </Button>
        </div>
      </div>

      {options.map((option, oi) => (
        <div key={oi} className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Input
              value={option.name}
              onChange={(e) => updateOptionName(oi, e.target.value)}
              placeholder="Option name (e.g. Size, Color)"
              className="flex-1"
            />
            <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(oi)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {option.values.map((val, vi) => (
              <Badge key={vi} variant="secondary" className="gap-1 pr-1">
                {val}
                <button type="button" onClick={() => removeValue(oi, vi)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newValue[oi] || ''}
              onChange={(e) => setNewValue({ ...newValue, [oi]: e.target.value })}
              placeholder="Add value..."
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addValue(oi))}
            />
            <Button type="button" variant="secondary" size="sm" onClick={() => addValue(oi)}>
              Add
            </Button>
          </div>
        </div>
      ))}

      {options.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No variants added. Add options like Size, Color, etc.
        </p>
      )}
    </div>
  );
};

export default VariantMatrix;
