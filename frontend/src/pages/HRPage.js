import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';

const HRPage = () => {
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [balance, setBalance] = useState(null);
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [newTotalDays, setNewTotalDays] = useState('');
  const [updatingBalance, setUpdatingBalance] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [requestsRes, usersRes] = await Promise.all([
        api.get('/vacation-requests/all'),
        api.get('/departments'),
      ]);
      setRequests(requestsRes.data);
      
      const allUsers = [];
      for (const dept of usersRes.data) {
      }
      setUsers(allUsers);
    } catch (error) {
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    setExportLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
    
      const response = await api.get(`/reports/export-csv?${params.toString()}`, {
        responseType: 'text', // Получаем текст, а не blob
      });
    
      const csvText = response.data.replace(/,/g, ';');
      const blob = new Blob([`\uFEFF${csvText}`], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `vacation_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

    
      toast.success('Отчет успешно экспортирован');
    } catch (error) {
      toast.error('Ошибка экспорта отчета');
    } finally {
      setExportLoading(false);
    }
  };


  const openBalanceDialog = async (user) => {
    setSelectedUser(user);
    setBalanceDialogOpen(true);
    try {
      const response = await api.get(`/vacation-balance/${user.id}`);
      setBalance(response.data);
      setNewTotalDays(response.data.total_days.toString());
    } catch (error) {
      toast.error('Ошибка загрузки баланса');
    }
  };

  const handleUpdateBalance = async () => {
    setUpdatingBalance(true);
    try {
      await api.put(`/vacation-balance/${selectedUser.id}`, {
        total_days: parseInt(newTotalDays),
      });
      toast.success('Баланс успешно обновлен');
      setBalanceDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Ошибка обновления баланса');
    } finally {
      setUpdatingBalance(false);
    }
  };

  const stats = {
    totalRequests: requests.length,
    pendingRequests: requests.filter(r => r.status === 'pending').length,
    approvedRequests: requests.filter(r => r.status === 'approved').length,
    rejectedRequests: requests.filter(r => r.status === 'rejected').length,
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
          <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground" data-testid="hr-title">
            HR Панель
          </h1>
          <p className="mt-2 text-muted-foreground">
            Управление отпусками и отчетность
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-xl">Всего заявок</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono" data-testid="total-requests">
                {stats.totalRequests}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-xl">На рассмотрении</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono text-yellow-600">
                {stats.pendingRequests}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-xl">Одобрено</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono text-green-600">
                {stats.approvedRequests}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-xl">Отклонено</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono text-red-600">
                {stats.rejectedRequests}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Export */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl">Экспорт отчетов</CardTitle>
            <CardDescription>Выгрузка данных в CSV формат</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="start_date">Дата начала</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  data-testid="export-start-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Дата окончания</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  data-testid="export-end-date"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleExportCSV}
                  disabled={exportLoading}
                  className="w-full gap-2"
                  data-testid="export-csv-btn"
                >
                  {exportLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Экспортировать CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* All Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl">Все заявки</CardTitle>
            <CardDescription>Полный список заявок по компании</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4" data-testid="all-requests-list">
              {requests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Нет заявок</p>
              ) : (
                requests.slice(0, 10).map((request) => (
                  <div
                    key={request.id}
                    className="rounded-sm border border-border p-4"
                    data-testid={`hr-request-${request.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{request.user_name}</span>
                          <span className="text-sm text-muted-foreground">({request.user_email})</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {request.start_date} — {request.end_date} ({request.work_days} дн.)
                        </div>
                      </div>
                      <div>
                        <span
                          className={`inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-medium ${
                            request.status === 'approved'
                              ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                              : request.status === 'rejected'
                              ? 'bg-red-500/10 text-red-700 dark:text-red-400'
                              : request.status === 'cancelled'
                              ? 'bg-gray-500/10 text-gray-700 dark:text-gray-400'
                              : 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                          }`}
                        >
                          {request.status === 'approved' ? 'Одобрена' : request.status === 'rejected' ? 'Отклонена' : request.status === 'cancelled'? 'Отменена': 'На рассмотрении'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
              {requests.length > 10 && (
                <p className="text-center text-sm text-muted-foreground">
                  Показано 10 из {requests.length} заявок
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default HRPage;
