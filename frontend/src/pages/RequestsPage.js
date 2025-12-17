import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { CheckCircle, XCircle, Clock, Loader2, User, Mail } from 'lucide-react';
import { toast } from 'sonner';

const RequestsPage = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [managerComment, setManagerComment] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await api.get('/vacation-requests/department');
      setRequests(response.data);
    } catch (error) {
      toast.error('Ошибка загрузки заявок');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    setSubmitting(true);
    try {
      await api.put(`/vacation-requests/${selectedRequest.id}`, {
        status: actionType,
        manager_comment: managerComment,
      });
      toast.success(`Заявка ${actionType === 'approved' ? 'одобрена' : 'отклонена'}`);
      setDialogOpen(false);
      setManagerComment('');
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка обновления заявки');
    } finally {
      setSubmitting(false);
    }
  };

  const openDialog = (request, action) => {
    setSelectedRequest(request);
    setActionType(action);
    setDialogOpen(true);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'На рассмотрении', className: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400', icon: Clock },
      approved: { label: 'Одобрена', className: 'bg-green-500/10 text-green-700 dark:text-green-400', icon: CheckCircle },
      rejected: { label: 'Отклонена', className: 'bg-red-500/10 text-red-700 dark:text-red-400', icon: XCircle },
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
        <div>
          <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground" data-testid="requests-title">
            Заявки на отпуск
          </h1>
          <p className="mt-2 text-muted-foreground">
            Управление заявками сотрудников отдела
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl">Заявки отдела</CardTitle>
            <CardDescription>Список заявок на согласование</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4" data-testid="requests-list">
              {requests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Нет заявок для отображения</p>
              ) : (
                requests.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-sm border border-border p-4 hover:border-primary/50 transition-colors"
                    data-testid={`request-item-${request.id}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{request.user_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span>{request.user_email}</span>
                        </div>
                      </div>
                      <div>{getStatusBadge(request.status)}</div>
                    </div>

                    <div className="grid gap-2 text-sm mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Даты:</span>
                        <span className="font-mono font-medium">
                          {request.start_date} — {request.end_date}
                        </span>
                        <span className="text-muted-foreground">({request.work_days} дн.)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Тип:</span>
                        <span>{request.vacation_type === 'annual' ? 'Ежегодный' : 'Без сохранения ЗП'}</span>
                      </div>
                      {request.comment && (
                        <div className="flex gap-2 mt-2">
                          <span className="text-muted-foreground">Комментарий:</span>
                          <span>{request.comment}</span>
                        </div>
                      )}
                    </div>

                    {request.status === 'pending' && (
                      <div className="flex gap-2 pt-3 border-t border-border">
                        <Button
                          size="sm"
                          onClick={() => openDialog(request, 'approved')}
                          className="gap-2"
                          data-testid={`approve-btn-${request.id}`}
                        >
                          <CheckCircle className="h-4 w-4" />
                          Одобрить
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openDialog(request, 'rejected')}
                          className="gap-2"
                          data-testid={`reject-btn-${request.id}`}
                        >
                          <XCircle className="h-4 w-4" />
                          Отклонить
                        </Button>
                      </div>
                    )}

                    {request.manager_comment && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-sm">
                          <span className="font-medium text-muted-foreground">Комментарий руководителя:</span>{' '}
                          {request.manager_comment}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-testid="action-dialog">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approved' ? 'Одобрить заявку' : 'Отклонить заявку'}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <>
                  {selectedRequest.user_name} • {selectedRequest.start_date} — {selectedRequest.end_date}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="manager_comment">Комментарий</Label>
              <Textarea
                id="manager_comment"
                value={managerComment}
                onChange={(e) => setManagerComment(e.target.value)}
                placeholder="Добавьте комментарий (опционально)"
                data-testid="manager-comment-input"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleAction}
                disabled={submitting}
                className="flex-1"
                data-testid="confirm-action-btn"
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Подтвердить
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Отмена
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default RequestsPage;
