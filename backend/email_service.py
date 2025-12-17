import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
import logging

logger = logging.getLogger(__name__)

SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'noreply@vacationflow.com')

class EmailService:
    def __init__(self):
        if not SENDGRID_API_KEY:
            logger.warning("SendGrid API key not configured")
            self.enabled = False
        else:
            self.sg = SendGridAPIClient(SENDGRID_API_KEY)
            self.enabled = True
    
    def send_vacation_status_email(self, to_email: str, employee_name: str, 
                                   start_date: str, end_date: str, 
                                   status: str, manager_comment: str = None):
        """Send vacation request status notification"""
        if not self.enabled:
            logger.info(f"Email sending disabled. Would send to {to_email}: {status}")
            return False
        
        status_ru = {
            'approved': 'Одобрена',
            'rejected': 'Отклонена',
            'pending': 'На рассмотрении'
        }.get(status, status)
        
        subject = f"Заявка на отпуск {status_ru}"
        
        html_content = f"""
        <html>
            <body style="font-family: Inter, sans-serif; line-height: 1.6; color: #0F172A;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E2E8F0; border-radius: 8px;">
                    <h2 style="color: #0F172A; margin-bottom: 20px;">Статус заявки на отпуск</h2>
                    
                    <p>Здравствуйте, {employee_name}!</p>
                    
                    <div style="background: #F1F5F9; padding: 15px; border-radius: 4px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Даты отпуска:</strong> {start_date} - {end_date}</p>
                        <p style="margin: 5px 0;"><strong>Статус:</strong> <span style="color: {'#10B981' if status == 'approved' else '#EF4444' if status == 'rejected' else '#F59E0B'}; font-weight: bold;">{status_ru}</span></p>
                    </div>
                    
                    {f'<div style="background: #FEF3C7; padding: 15px; border-radius: 4px; margin: 20px 0;"><p style="margin: 0;"><strong>Комментарий руководителя:</strong></p><p style="margin: 10px 0 0 0;">{manager_comment}</p></div>' if manager_comment else ''}
                    
                    <p style="margin-top: 30px; color: #64748B; font-size: 14px;">Это автоматическое уведомление из системы VacationFlow.</p>
                </div>
            </body>
        </html>
        """
        
        try:
            message = Mail(
                from_email=SENDER_EMAIL,
                to_emails=to_email,
                subject=subject,
                html_content=html_content
            )
            
            response = self.sg.send(message)
            logger.info(f"Email sent to {to_email}, status code: {response.status_code}")
            return response.status_code == 202
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False

email_service = EmailService()