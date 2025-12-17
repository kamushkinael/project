import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Calendar, Plus, Clock, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const DashboardPage = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    vacation_type: 'annual',
    comment: '',
  });
  const [overlapWarnings, setOverlapWarnings] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [balanceRes, requestsRes] = await Promise.all([
        api.get('/vacation-balance/my'),
        api.get('/vacation-requests/my'),
      ]);
      setBalance(balanceRes.data);
      setRequests(requestsRes.data);
    } catch (error) {
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const checkOverlap = async () => {
    if (!formData.start_date || !formData.end_date) return;
    
    try {
      const response = await api.post('/vacation-requests/check-overlap', formData);
      setOverlapWarnings(response.data);
      if (response.data.length > 0) {
        toast.warning('Обнаружены пересечения отпусков');
      }
    } catch (error) {
      console.error('Error checking overlap:', error);
    }
  };

  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      checkOverlap();
    }
  }, [formData.start_date, formData.end_date]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.post('/vacation-requests', formData);
      toast.success('Заявка успешно подана');
      setDialogOpen(false);
      setFormData({ start_date: '', end_date: '', vacation_type: 'annual', comment: '' });
      setOverlapWarnings([]);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка подачи заявки');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: {
        label: 'На рассмотрении',
        className: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
        icon: Clock,
      },
      approved: {
        label: 'Одобрена',
        className: 'bg-green-500/10 text-green-700 dark:text-green-400',
        icon: CheckCircle,
      },
      rejected: {
        label: 'Отклонена',
        className: 'bg-red-500/10 text-red-700 dark:text-red-400',
        icon: XCircle,
      },
      cancelled: {
        label: 'Отменена',
        className: 'bg-gray-500/10 text-gray-700 dark:text-gray-400',
        icon: XCircle,
      },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-medium ${config.className}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground" data-testid="dashboard-title">
              Главная
            </h1>
            <p className="mt-2 text-muted-foreground">
              Добро пожаловать, {user?.full_name}
            </p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="new-request-btn">
                <Plus className="h-4 w-4" />
                Новая заявка
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" data-testid="new-request-dialog">
              <DialogHeader>
                <DialogTitle>Новая заявка на отпуск</DialogTitle>
                <DialogDescription>
                  Заполните данные для подачи заявки
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Дата начала</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleInputChange('start_date', e.target.value)}
                    required
                    data-testid="start-date-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">Дата окончания</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleInputChange('end_date', e.target.value)}
                    required
                    data-testid="end-date-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vacation_type">Тип отпуска</Label>
                  <Select value={formData.vacation_type} onValueChange={(value) => handleInputChange('vacation_type', value)}>
                    <SelectTrigger data-testid="vacation-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="annual">Ежегодный</SelectItem>
                      <SelectItem value="unpaid">Без сохранения ЗП</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comment">Комментарий (опционально)</Label>
                  <Textarea
                    id="comment"
                    value={formData.comment}
                    onChange={(e) => handleInputChange('comment', e.target.value)}
                    placeholder="Дополнительная информация"
                    data-testid="comment-input"
                  />
                </div>
                
                {overlapWarnings.length > 0 && (
                  <div className="rounded-sm border border-yellow-500/50 bg-yellow-500/10 p-3" data-testid="overlap-warning">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-yellow-900 dark:text-yellow-200 mb-1">Предупреждение о пересечении</p>
                        <p className="text-yellow-800 dark:text-yellow-300">
                          В указанные даты уже запланированы отпуска других сотрудников отдела.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={submitting} className="flex-1" data-testid="submit-request-btn">
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Подать заявку
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                    Отмена
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card data-testid="balance-card">
            <CardHeader>
              <CardTitle className="font-heading text-xl">Баланс отпуска</CardTitle>
              <CardDescription>{new Date().getFullYear()} год</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono" data-testid="available-days">
                {balance ? balance.total_days - balance.used_days : 0} дней
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Использовано: {balance?.used_days || 0} из {balance?.total_days || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-xl">На рассмотрении</CardTitle>
              <CardDescription>Ожидают согласования</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono">
                {requests.filter((r) => r.status === 'pending').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-xl">Одобрено</CardTitle>
              <CardDescription>Утвержденные заявки</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono">
                {requests.filter((r) => r.status === 'approved').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* My Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl">Мои заявки</CardTitle>
            <CardDescription>История заявок на отпуск</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4" data-testid="requests-list">
              {requests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">У вас пока нет заявок</p>
              ) : (
                requests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between rounded-sm border border-border p-4 hover:border-primary/50 transition-colors"
                    data-testid={`request-item-${request.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-medium">
                          {request.start_date} — {request.end_date}
                        </span>
                        <span className="text-muted-foreground text-sm">({request.work_days} дн.)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {request.vacation_type === 'annual' ? 'Ежегодный' : 'Без сохранения ЗП'}
                        </span>
                      </div>
                      {request.manager_comment && (
                        <p className="text-sm text-muted-foreground mt-2">
                          <span className="font-medium">Комментарий:</span> {request.manager_comment}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(request.status)}

                      {request.status === 'approved' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              await api.put(`/vacation-requests/${request.id}`, {
                                status: 'cancelled',
                                manager_comment: 'Отпуск отменён сотрудником',
                              });
                              toast.success('Отпуск отменён');
                              fetchData();
                            } catch (e) {
                              toast.error('Не удалось отменить отпуск');
                            }
                          }}
                        >
                          Отменить
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default DashboardPage;
