"use client";

import { useState, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
}

interface CoinSelectorProps {
  coins: Coin[];
  selectedCoinId: string;
  onSelect: (coinId: string) => void;
}

export function CoinSelector({ coins, selectedCoinId, onSelect }: CoinSelectorProps) {
  const [search, setSearch] = useState("");

  const filteredCoins = useMemo(() => {
    if (!search) return coins;
    const q = search.toLowerCase();
    return coins.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q)
    );
  }, [coins, search]);

  const selectedCoin = coins.find((c) => c.id === selectedCoinId);

  return (
    <Select value={selectedCoinId} onValueChange={onSelect}>
      <SelectTrigger className="w-full md:w-[280px] bg-card border-border">
        <SelectValue>
          {selectedCoin ? (
            <span className="flex items-center gap-2">
              <img
                src={selectedCoin.image}
                alt={selectedCoin.name}
                className="size-5 rounded-full"
              />
              <span className="font-medium">{selectedCoin.name}</span>
              <span className="text-muted-foreground">
                {selectedCoin.symbol}
              </span>
            </span>
          ) : (
            "Seleccionar cripto..."
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        <div className="sticky top-0 bg-popover p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cripto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 bg-secondary/50"
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
        </div>
        {filteredCoins.map((coin) => (
          <SelectItem key={coin.id} value={coin.id}>
            <div className="flex items-center gap-2">
              <img
                src={coin.image}
                alt={coin.name}
                className="size-5 rounded-full"
              />
              <span className="font-medium">{coin.name}</span>
              <span className="text-muted-foreground text-xs">
                {coin.symbol}
              </span>
            </div>
          </SelectItem>
        ))}
        {filteredCoins.length === 0 && (
          <div className="p-4 text-center text-muted-foreground text-sm">
            No se encontraron resultados
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
