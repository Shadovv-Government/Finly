import { CategoryBadge } from '../components/CategoryBadge';
import { AmountDisplay } from '../components/AmountDisplay';
import { categories } from '../data/mockData';

export const ComponentShowcase = () => {
  return (
    <div className="pb-20 bg-background min-h-screen">
      <div className="px-4 py-4 bg-card border-b border-border">
        <h1 className="text-xl font-bold">Component Library</h1>
        <p className="text-sm text-muted-foreground">Finly Design System Components</p>
      </div>

      {/* Category Badges */}
      <div className="px-4 py-6">
        <h2 className="font-bold mb-4">Category Badges</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Small</p>
            <div className="flex gap-2 flex-wrap">
              {categories.slice(0, 4).map(cat => (
                <CategoryBadge key={cat.id} categoryId={cat.id} size="sm" />
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">Medium (with name)</p>
            <div className="flex gap-3 flex-wrap">
              {categories.slice(0, 4).map(cat => (
                <CategoryBadge key={cat.id} categoryId={cat.id} size="md" showName />
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">Large</p>
            <div className="flex gap-3 flex-wrap">
              {categories.slice(0, 4).map(cat => (
                <CategoryBadge key={cat.id} categoryId={cat.id} size="lg" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Amount Display */}
      <div className="px-4 py-6">
        <h2 className="font-bold mb-4">Amount Display</h2>
        <div className="bg-card rounded-2xl p-4 border border-border space-y-3">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Income (Green)</p>
            <AmountDisplay amount={50000} type="income" size="xl" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">Expense (Red)</p>
            <AmountDisplay amount={2500} type="expense" size="lg" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">Neutral</p>
            <AmountDisplay amount={75000} type="neutral" size="md" showSign={false} />
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="px-4 py-6">
        <h2 className="font-bold mb-4">Buttons</h2>
        <div className="space-y-3">
          <button className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-700 text-white rounded-xl font-semibold">
            Primary Button
          </button>
          <button className="w-full py-4 bg-muted text-foreground rounded-xl font-semibold">
            Secondary Button
          </button>
          <button className="w-full py-4 border-2 border-dashed border-border rounded-xl text-muted-foreground font-semibold">
            Dashed Button
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="px-4 py-6">
        <h2 className="font-bold mb-4">Cards</h2>
        <div className="space-y-3">
          <div className="bg-card rounded-2xl p-4 border border-border">
            <h3 className="font-semibold mb-2">Standard Card</h3>
            <p className="text-sm text-muted-foreground">
              Basic card with border and rounded corners
            </p>
          </div>
          <div className="bg-gradient-to-br from-violet-600 to-indigo-700 text-white rounded-2xl p-4">
            <h3 className="font-semibold mb-2">Gradient Card</h3>
            <p className="text-sm opacity-90">
              Featured card with gradient background
            </p>
          </div>
        </div>
      </div>

      {/* Color Palette */}
      <div className="px-4 py-6">
        <h2 className="font-bold mb-4">Color Palette</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-violet-600 text-white rounded-2xl p-4">
            <p className="text-sm font-semibold">Primary</p>
            <p className="text-xs opacity-80">#7c3aed</p>
          </div>
          <div className="bg-green-600 text-white rounded-2xl p-4">
            <p className="text-sm font-semibold">Success</p>
            <p className="text-xs opacity-80">#22c55e</p>
          </div>
          <div className="bg-red-600 text-white rounded-2xl p-4">
            <p className="text-sm font-semibold">Danger</p>
            <p className="text-xs opacity-80">#ef4444</p>
          </div>
          <div className="bg-yellow-600 text-white rounded-2xl p-4">
            <p className="text-sm font-semibold">Warning</p>
            <p className="text-xs opacity-80">#f59e0b</p>
          </div>
        </div>
      </div>
    </div>
  );
};
