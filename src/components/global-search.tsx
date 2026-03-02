'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  ShoppingCart,
  AlertTriangle,
  Store,
  Loader2,
  ArrowRight,
  Command,
} from 'lucide-react';

interface SearchResult {
  type: 'order' | 'issue' | 'store';
  id: string;
  title: string;
  subtitle: string;
  href: string;
  status: string;
}

const typeIcons: Record<string, any> = {
  order: ShoppingCart,
  issue: AlertTriangle,
  store: Store,
};

const typeLabels: Record<string, string> = {
  order: 'Sipariş',
  issue: 'Sorun',
  store: 'Mağaza',
};

const statusColors: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-yellow-100 text-yellow-800',
  PRODUCTION: 'bg-purple-100 text-purple-800',
  READY: 'bg-cyan-100 text-cyan-800',
  SHIPPED: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-100 text-green-800',
  OPEN: 'bg-red-100 text-red-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  RESOLVED: 'bg-green-100 text-green-800',
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-800',
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Ctrl+K / Cmd+K kısayolu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Arama
  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        setSelectedIndex(0);
      }
    } catch (error) {
      console.error('Search error:', error);
    }
    setLoading(false);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  // Klavye navigasyonu
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      navigateTo(results[selectedIndex]);
    }
  };

  const navigateTo = (result: SearchResult) => {
    setOpen(false);
    setQuery('');
    setResults([]);
    router.push(result.href);
  };

  return (
    <>
      {/* Search trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground border rounded-lg hover:bg-accent transition-colors w-full sm:w-auto"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Ara...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 ml-auto text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">
          <Command className="h-2.5 w-2.5" />K
        </kbd>
      </button>

      {/* Search dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
          <div className="flex items-center border-b px-4">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              ref={inputRef}
              placeholder="Sipariş no, müşteri, takip no ile ara..."
              className="border-0 shadow-none focus-visible:ring-0 text-base"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {results.length === 0 && query.length >= 2 && !loading && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Sonuç bulunamadı
              </div>
            )}

            {results.length === 0 && query.length < 2 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <p>Aramaya başlayın (en az 2 karakter)</p>
                <div className="flex items-center justify-center gap-4 mt-3 text-xs">
                  <span>↑↓ gezin</span>
                  <span>↵ aç</span>
                  <span>esc kapat</span>
                </div>
              </div>
            )}

            {results.length > 0 && (
              <div className="py-2">
                {results.map((result, i) => {
                  const Icon = typeIcons[result.type] || Search;
                  return (
                    <button
                      key={`${result.type}-${result.id}`}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-accent transition-colors ${
                        i === selectedIndex ? 'bg-accent' : ''
                      }`}
                      onClick={() => navigateTo(result)}
                      onMouseEnter={() => setSelectedIndex(i)}
                    >
                      <div className="p-1.5 rounded-md bg-muted shrink-0">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{result.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={`text-[10px] ${statusColors[result.status] || 'bg-gray-100 text-gray-800'}`}>
                          {result.status}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {typeLabels[result.type]}
                        </Badge>
                      </div>
                      {i === selectedIndex && (
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t px-4 py-2 flex items-center justify-between text-[10px] text-muted-foreground bg-muted/30">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><kbd className="bg-muted px-1 rounded">↑</kbd><kbd className="bg-muted px-1 rounded">↓</kbd> gezin</span>
              <span className="flex items-center gap-1"><kbd className="bg-muted px-1 rounded">↵</kbd> aç</span>
              <span className="flex items-center gap-1"><kbd className="bg-muted px-1 rounded">esc</kbd> kapat</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
