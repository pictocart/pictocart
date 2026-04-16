interface VariantOption {
  name: string;
  values: string[];
}

interface Props {
  variants: VariantOption[];
  selected: Record<string, string>;
  onChange: (name: string, value: string) => void;
  colors: any;
  borderRadius: number;
}

const COLOR_MAP: Record<string, string> = {
  red: '#ef4444', blue: '#3b82f6', green: '#22c55e', black: '#111', white: '#fff',
  yellow: '#eab308', pink: '#ec4899', purple: '#a855f7', orange: '#f97316',
  brown: '#92400e', grey: '#6b7280', gray: '#6b7280', navy: '#1e3a5f',
  maroon: '#7f1d1d', beige: '#d4c5a9', cream: '#fffdd0', gold: '#d4a017',
  silver: '#c0c0c0', teal: '#14b8a6', coral: '#f87171', olive: '#84cc16',
};

const isColorVariant = (name: string) => /colou?r/i.test(name);

const VariantSelector = ({ variants, selected, onChange, colors, borderRadius }: Props) => {
  if (!variants || variants.length === 0) return null;

  return (
    <div className="space-y-4">
      {variants.map((variant) => {
        const isColor = isColorVariant(variant.name);
        return (
          <div key={variant.name}>
            <span className="text-sm font-medium">
              {variant.name}: <span className="font-normal opacity-60">{selected[variant.name] || 'Select'}</span>
            </span>
            <div className="flex flex-wrap gap-2 mt-2">
              {variant.values.map((value) => {
                const isSelected = selected[variant.name] === value;
                const colorHex = isColor ? COLOR_MAP[value.toLowerCase()] : null;

                if (colorHex) {
                  return (
                    <button
                      key={value}
                      onClick={() => onChange(variant.name, value)}
                      title={value}
                      className="w-8 h-8 rounded-full border-2 transition-all duration-200"
                      style={{
                        backgroundColor: colorHex,
                        borderColor: isSelected ? colors.primary : colors.secondary,
                        transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                        boxShadow: isSelected ? `0 0 0 2px ${colors.primary}40` : 'none',
                      }}
                    />
                  );
                }

                return (
                  <button
                    key={value}
                    onClick={() => onChange(variant.name, value)}
                    className="px-4 py-2 text-sm font-medium border transition-all duration-200"
                    style={{
                      borderColor: isSelected ? colors.primary : colors.secondary,
                      backgroundColor: isSelected ? colors.primary + '10' : 'transparent',
                      color: isSelected ? colors.primary : colors.text,
                      borderRadius: `${borderRadius / 2}px`,
                      transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                    }}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default VariantSelector;
