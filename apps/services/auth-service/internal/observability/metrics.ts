import { Counter } from 'prom-client';

export const registerUserCounter = new Counter({
  name: 'auth_service_register_user_total',
  help: 'Total de usuarios registrados',
});

export const passwordResetRequestedCounter = new Counter({
    name: 'auth_service_password_reset_requested_total',
    help: 'Total de solicitudes de restablecimiento de contraseña',
});

export const passwordResetCompletedCounter = new Counter({
    name: 'auth_service_password_reset_completed_total',
    help: 'Total de restablecimientos de contraseña completados',
});

export const tokenGrantCounter = new Counter({
  name: 'auth_service_token_grant_total',
  help: 'Total de tokens concedidos por tipo de grant',
  labelNames: ['grant_type', 'client_id'],
});

export const loginSuccessCounter = new Counter({
    name: 'auth_service_login_success_total',
    help: 'Total de inicios de sesión exitosos',
});

export const loginFailCounter = new Counter({
    name: 'auth_service_login_fail_total',
    help: 'Total de inicios de sesión fallidos',
});
