import { clearDb } from '../../internal/adapters/db/memory';
import request from 'supertest';
import express from 'express';
import { forgotPasswordHandler } from '../../internal/adapters/http/forgot-password.handler';
import app from '../app.test';

describe('POST /forgot-password', () => {
  beforeEach(() => { clearDb(); });
  it('debe aceptar email válido', async () => {
    // Registrar usuario primero
    const email = `forgot_${Date.now()}@demo.com`;
    await request(app)
      .post('/register')
      .send({ email, password: '12345678', name: 'Test User' });
    // Recuperación
    const res = await request(app)
      .post('/forgot-password')
      .send({ email });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Email enviado');
  });

  it('debe rechazar email inválido', async () => {
    const res = await request(app)
      .post('/forgot-password')
      .send({ email: 'bademail' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Datos inválidos');
  });
});
