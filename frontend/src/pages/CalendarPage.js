import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const CalendarPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCalendarEvents();
  }, []);

  const fetchCalendarEvents = async () => {
    try {
      const response = await api.get('/calendar/department');
      setEvents(response.data);
    } catch (error) {
      toast.error('Ошибка загрузки календаря');
    } finally {
      setLoading(false);
    }
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
          <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground" data-testid="calendar-title">
            Календарь отпусков
          </h1>
          <p className="mt-2 text-muted-foreground">
            График отпусков вашего отдела
          </p>
        </div>

        <Card data-testid="calendar-card">
          <CardHeader>
            <CardTitle className="font-heading text-xl">График отпусков отдела</CardTitle>
            <CardDescription>Одобренные отпуска сотрудников</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="calendar-container" style={{ minHeight: '600px' }}>
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,listMonth'
                }}
                locale="ru"
                buttonText={{
                  today: 'Сегодня',
                  month: 'Месяц',
                  list: 'Список'
                }}
                events={events}
                height="auto"
                eventDisplay="block"
                displayEventTime={false}
                eventClick={(info) => {
                  const props = info.event.extendedProps;
                  toast.info(`${info.event.title} - ${props.work_days} дней`);
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default CalendarPage;
