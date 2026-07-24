'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Trash2, Loader2, FileText, Pencil, Check, X, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
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
  refreshKey?: number;
  onHistoryUpdate?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function HistorySidebar({ onSelectHistory, selectedId, refreshKey, onHistoryUpdate, collapsed, onToggleCollapse }: HistorySidebarProps) {
  const [histories, setHistories] = useState<ConversionHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
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

  // Refresh when refreshKey changes
  useEffect(() => {
    if (refreshKey && refreshKey > 0) {
      fetchHistories();
    }
  }, [refreshKey]);

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
      onHistoryUpdate?.();
    }
  };

  const handleRenameStart = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditingTitle(currentTitle || 'Untitled');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleRenameConfirm = async () => {
    if (!editingId) return;
    
    const token = await getToken();
    const response = await fetch(`/api/history?id=${editingId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: editingTitle,
      }),
    });
    
    if (response.ok) {
      setHistories((prev) => 
        prev.map((h) => h.id === editingId ? { ...h, title: editingTitle } : h)
      );
      onHistoryUpdate?.();
    }
    
    setEditingId(null);
    setEditingTitle('');
  };

  const handleRenameCancel = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameConfirm();
    } else if (e.key === 'Escape') {
      handleRenameCancel();
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

  // Collapsed state - show expand button
  if (collapsed) {
    return (
      <div className="flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="h-10 w-10"
          title="展开历史记录"
        >
          <PanelLeftOpen className="h-5 w-5 text-muted-foreground" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-64 border-r border-border/50 bg-card/30 backdrop-blur-sm flex flex-col">
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-serif text-lg">History</h2>
        </div>
        {onToggleCollapse && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-8 w-8"
            title="收起侧边栏"
          >
            <PanelLeftClose className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
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
                onClick={() => editingId !== item.id && onSelectHistory(item)}
                className={cn(
                  'p-3 rounded-lg cursor-pointer transition-colors group',
                  'hover:bg-accent/50',
                  selectedId === item.id && 'bg-accent'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {editingId === item.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          ref={inputRef}
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={handleRenameKeyDown}
                          className="h-6 text-sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={(e) => { e.stopPropagation(); handleRenameConfirm(); }}
                        >
                          <Check className="h-3 w-3 text-green-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={(e) => { e.stopPropagation(); handleRenameCancel(); }}
                        >
                          <X className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <p className="text-sm font-medium truncate">
                            {item.title || 'Untitled'}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(item.created_at)}
                        </p>
                      </>
                    )}
                  </div>
                  {editingId !== item.id && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => handleRenameStart(item.id, item.title, e)}
                      >
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => handleDelete(item.id, e)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  )}
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
