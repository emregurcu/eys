'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  Plus,
  MessageSquare,
  User,
  Package,
  Truck,
  RotateCcw,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  issueTypeLabels,
  priorityLabels,
  priorityColors,
  formatDate,
} from '@/lib/utils';

const issueTypeIcons: Record<string, any> = {
  SHIPPING: Truck,
  RETURN: RotateCcw,
  PRODUCT: Package,
  CUSTOMER: User,
  OTHER: HelpCircle,
};

const statusLabels: Record<string, string> = {
  OPEN: 'Açık',
  IN_PROGRESS: 'İşleniyor',
  RESOLVED: 'Çözüldü',
  CLOSED: 'Kapatıldı',
};

const statusColors: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-800',
};

interface Issue {
  id: string;
  type: string;
  status: string;
  title: string;
  description: string;
  priority: number;
  store: { id: string; name: string };
  order: { id: string; orderNumber: string } | null;
  creator: { id: string; name: string };
  assignee: { id: string; name: string } | null;
  createdAt: string;
  resolvedAt: string | null;
  comments?: any[];
  _count?: { comments: number };
}

interface Store {
  id: string;
  name: string;
}

interface Order {
  id: string;
  orderNumber: string;
}

interface User {
  id: string;
  name: string;
}

export default function IssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // Form state
  const [issueForm, setIssueForm] = useState({
    storeId: '',
    orderId: 'none',
    type: 'SHIPPING',
    title: '',
    description: '',
    priority: '2',
    assigneeId: 'none',
  });

  useEffect(() => {
    fetchIssues();
    fetchFormData();
  }, []);

  const fetchIssues = async () => {
    setPageLoading(true);
    try {
      const res = await fetch('/api/issues');
      if (res.ok) {
        setIssues(await res.json());
      }
    } catch (error) {
      toast.error('Sorunlar yüklenemedi');
    }
    setPageLoading(false);
  };

  const fetchFormData = async () => {
    try {
      const [storesRes, ordersRes, usersRes] = await Promise.all([
        fetch('/api/stores'),
        fetch('/api/orders'),
        fetch('/api/users'),
      ]);

      if (storesRes.ok) setStores(await storesRes.json());
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
    } catch (error) {
      console.error('Form verileri yüklenemedi');
    }
  };

  const fetchIssueDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/issues/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedIssue(data);
      }
    } catch (error) {
      toast.error('Sorun detayı yüklenemedi');
    }
  };

  const filteredIssues = issues.filter((issue) => {
    const matchSearch = issue.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || issue.status === statusFilter;
    const matchType = typeFilter === 'all' || issue.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const saveIssue = async () => {
    if (!issueForm.storeId || !issueForm.title) {
      toast.error('Mağaza ve başlık zorunludur');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...issueForm,
          priority: parseInt(issueForm.priority),
          orderId: issueForm.orderId === 'none' ? null : issueForm.orderId,
          assigneeId: issueForm.assigneeId === 'none' ? null : issueForm.assigneeId,
        }),
      });

      if (res.ok) {
        toast.success('Sorun oluşturuldu');
        setShowAddDialog(false);
        setIssueForm({
          storeId: '',
          orderId: 'none',
          type: 'SHIPPING',
          title: '',
          description: '',
          priority: '2',
          assigneeId: 'none',
        });
        fetchIssues();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Kayıt başarısız');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
    setLoading(false);
  };

  const updateIssueStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/issues/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        toast.success('Durum güncellendi');
        fetchIssues();
        if (selectedIssue?.id === id) {
          fetchIssueDetail(id);
        }
      }
    } catch (error) {
      toast.error('Güncelleme başarısız');
    }
  };

  const addComment = async () => {
    if (!selectedIssue || !newComment.trim()) return;

    try {
      const res = await fetch(`/api/issues/${selectedIssue.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment }),
      });

      if (res.ok) {
        toast.success('Yorum eklendi');
        setNewComment('');
        fetchIssueDetail(selectedIssue.id);
      }
    } catch (error) {
      toast.error('Yorum eklenemedi');
    }
  };

  const openIssueDetail = (issue: Issue) => {
    setSelectedIssue(issue);
    fetchIssueDetail(issue.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sorun Takibi</h1>
          <p className="text-muted-foreground">
            Kargo, iade ve ürün sorunlarını yönetin
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" /> Yeni Sorun
        </Button>
      </div>

      {/* Filtreler */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Sorun ara..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                <SelectItem value="OPEN">Açık</SelectItem>
                <SelectItem value="IN_PROGRESS">İşleniyor</SelectItem>
                <SelectItem value="RESOLVED">Çözüldü</SelectItem>
                <SelectItem value="CLOSED">Kapatıldı</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Tür" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Türler</SelectItem>
                <SelectItem value="SHIPPING">Kargo</SelectItem>
                <SelectItem value="RETURN">İade</SelectItem>
                <SelectItem value="PRODUCT">Ürün</SelectItem>
                <SelectItem value="CUSTOMER">Müşteri</SelectItem>
                <SelectItem value="OTHER">Diğer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sorun Listesi */}
      <div className="space-y-3">
        {pageLoading ? (
          // Skeleton loading
          [...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
                    <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                    <div className="h-3 bg-muted rounded animate-pulse w-1/4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredIssues.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Sorun bulunamadı
            </CardContent>
          </Card>
        ) : (
          filteredIssues.map((issue) => {
            const Icon = issueTypeIcons[issue.type] || HelpCircle;
            return (
              <Card
                key={issue.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => openIssueDetail(issue)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-full bg-muted">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-medium">{issue.title}</h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {issue.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={priorityColors[issue.priority]}>
                            {priorityLabels[issue.priority]}
                          </Badge>
                          <Badge className={statusColors[issue.status]}>
                            {statusLabels[issue.status]}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>{issue.store.name}</span>
                        {issue.order && <span>{issue.order.orderNumber}</span>}
                        <span>{formatDate(issue.createdAt)}</span>
                        {(issue._count?.comments || 0) > 0 && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {issue._count?.comments}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Yeni Sorun Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Yeni Sorun Oluştur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mağaza *</Label>
                <Select
                  value={issueForm.storeId}
                  onValueChange={(v) => setIssueForm({ ...issueForm, storeId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sorun Türü</Label>
                <Select
                  value={issueForm.type}
                  onValueChange={(v) => setIssueForm({ ...issueForm, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SHIPPING">Kargo</SelectItem>
                    <SelectItem value="RETURN">İade</SelectItem>
                    <SelectItem value="PRODUCT">Ürün</SelectItem>
                    <SelectItem value="CUSTOMER">Müşteri</SelectItem>
                    <SelectItem value="OTHER">Diğer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Başlık *</Label>
              <Input
                value={issueForm.title}
                onChange={(e) => setIssueForm({ ...issueForm, title: e.target.value })}
                placeholder="Sorun başlığı"
              />
            </div>

            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Textarea
                value={issueForm.description}
                onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })}
                placeholder="Sorun detayları..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Öncelik</Label>
                <Select
                  value={issueForm.priority}
                  onValueChange={(v) => setIssueForm({ ...issueForm, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Düşük</SelectItem>
                    <SelectItem value="2">Normal</SelectItem>
                    <SelectItem value="3">Yüksek</SelectItem>
                    <SelectItem value="4">Acil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>İlgili Sipariş</Label>
                <Select
                  value={issueForm.orderId}
                  onValueChange={(v) => setIssueForm({ ...issueForm, orderId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin (opsiyonel)" />
                  </SelectTrigger>
                  <SelectContent>
                  <SelectItem value="none">Yok</SelectItem>
                    {orders.map((order: any) => (
                      <SelectItem key={order.id} value={order.id}>{order.orderNumber}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Atanan Kişi</Label>
              <Select
                value={issueForm.assigneeId}
                onValueChange={(v) => setIssueForm({ ...issueForm, assigneeId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seçin (opsiyonel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Atama yapma</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                İptal
              </Button>
              <Button onClick={saveIssue} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Oluştur
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sorun Detay Modal */}
      <Dialog open={!!selectedIssue} onOpenChange={() => setSelectedIssue(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sorun Detayı</DialogTitle>
          </DialogHeader>
          {selectedIssue && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={statusColors[selectedIssue.status]}>
                  {statusLabels[selectedIssue.status]}
                </Badge>
                <Badge className={priorityColors[selectedIssue.priority]}>
                  {priorityLabels[selectedIssue.priority]}
                </Badge>
                <Badge variant="outline">
                  {issueTypeLabels[selectedIssue.type]}
                </Badge>
              </div>

              <div>
                <h3 className="font-semibold text-lg">{selectedIssue.title}</h3>
                <p className="text-muted-foreground mt-1">
                  {selectedIssue.description || 'Açıklama yok'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Mağaza</p>
                  <p className="font-medium">{selectedIssue.store.name}</p>
                </div>
                {selectedIssue.order && (
                  <div>
                    <p className="text-muted-foreground">Sipariş</p>
                    <p className="font-medium">{selectedIssue.order.orderNumber}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Oluşturan</p>
                  <p className="font-medium">{selectedIssue.creator.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Atanan</p>
                  <p className="font-medium">
                    {selectedIssue.assignee?.name || 'Atanmadı'}
                  </p>
                </div>
              </div>

              {/* Yorumlar */}
              <div>
                <h4 className="font-medium mb-2">Yorumlar</h4>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {!selectedIssue.comments || selectedIssue.comments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Henüz yorum yok</p>
                  ) : (
                    selectedIssue.comments.map((comment: any) => (
                      <div key={comment.id} className="bg-muted p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{comment.user.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex gap-2 mt-3">
                  <Input
                    placeholder="Yorum ekle..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addComment()}
                  />
                  <Button size="sm" onClick={addComment}>Gönder</Button>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Select 
                  defaultValue={selectedIssue.status}
                  onValueChange={(v) => updateIssueStatus(selectedIssue.id, v)}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Açık</SelectItem>
                    <SelectItem value="IN_PROGRESS">İşleniyor</SelectItem>
                    <SelectItem value="RESOLVED">Çözüldü</SelectItem>
                    <SelectItem value="CLOSED">Kapatıldı</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="flex-1" variant="outline" onClick={() => setSelectedIssue(null)}>
                  Kapat
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
