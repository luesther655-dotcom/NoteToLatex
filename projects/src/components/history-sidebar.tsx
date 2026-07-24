'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Trash2, Loader2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConversionHistoryItem {
  id: string;
  title: string;
  markdown_content: string;
  latex_content: string;
  created_at: string;
}

interface HistorySidebarProps {
  onSelectHistory: (item: ConversionHistoryItem) => void;
  selectedId?: string;
}

export function HistorySidebar({ onSelectHistory, selectedId }: HistorySidebarProps) {
  const [histories, setHistories] = useState<ConversionHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { user, getToken } = useAuth();

  const fetchHistories = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const token = await getToken();
      const response = await fetch('/api/history', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setHistories(data.histories || []);
      }
    } catch (error) {
      console.error('Failed to fetch histories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchHistories();
    } else {
      setHistories([]);
    }
  }, [user]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const token = await getToken();
    const response = await fetch(`/api/history?id=${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (response.ok) {
      setHistories((prev) => prev.filter((h) => h.id !== id));
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!user) {
    return null;
  }

  return (
    <div className="w-64 border-r border-border/50 bg-card/30 backdrop-blur-sm flex flex-col">
      <div className="p-4 border-b border-border/50 flex items-center gap-2">
        <History className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-serif text-lg">History</h2>
      </div>
      
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : histories.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No conversion history yet
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {histories.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectHistory(item)}
                className={cn(
                  'p-3 rounded-lg cursor-pointer transition-colors group',
                  'hover:bg-accent/50',
                  selectedId === item.id && 'bg-accent'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <p className="text-sm font-medium truncate">
                        {item.title || 'Untitled'}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(item.created_at)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDelete(item.id, e)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

export type { ConversionHistoryItem };
