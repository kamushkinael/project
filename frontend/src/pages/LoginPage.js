import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const LoginPage = () => {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await authLogin({ login, password });
      toast.success('Вход выполнен успешно');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 py-24 relative"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1649182784901-48f5f2d40ecc?crop=entropy&cs=srgb&fm=jpg&q=85)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 to-slate-900/80" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-white">
              <Calendar className="h-8 w-8 text-slate-900" />
            </div>
            <span className="font-heading text-3xl font-bold text-white">
              VacationFlow
            </span>
          </div>
          <h1 className="font-heading text-4xl font-bold tracking-tight text-white mb-6">
            Управление отпусками
            <br />
            стало проще
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed max-w-md">
            Планируйте отпуска, согласовывайте заявки и отслеживайте баланс дней — всё в одной системе.
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary">
                <Calendar className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="font-heading text-2xl font-bold text-foreground">
                VacationFlow
              </span>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground mb-2">
              Вход в систему
            </h2>
            <p className="text-sm text-muted-foreground">
              Введите ваши учётные данные для доступа
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="login">Логин</Label>
              <Input
                id="login"
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                required
                disabled={loading}
                placeholder="Введите логин"
                data-testid="login-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                placeholder="Введите пароль"
                data-testid="password-input"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              data-testid="login-submit-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Вход...
                </>
              ) : (
                'Войти'
              )}
            </Button>
          </form>

          <div className="mt-8 p-4 rounded-sm bg-muted">
            <p className="text-xs font-mono text-muted-foreground mb-2">Тестовые данные:</p>
            <div className="space-y-1 text-xs font-mono">
              <div>HR: <span className="text-foreground">hr_admin / password123</span></div>
              <div>Менеджер: <span className="text-foreground">dev_manager / password123</span></div>
              <div>Сотрудник: <span className="text-foreground">developer1 / password123</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
