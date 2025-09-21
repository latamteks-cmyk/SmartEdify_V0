/**
 * [CONSOLIDACIÓN] Esta migración ha sido DESHABILITADA para evitar duplicidad.
 * 
 * MOTIVO: Las tablas users, user_roles y audit_security ya se crean en 1757854509341_base.js
 * 
 * FECHA: 2025-09-21
 * RESPONSABLE: CTO - Optimización de testing infrastructure
 * 
 * NOTA: No eliminar este archivo para mantener registro histórico, pero el contenido
 * ha sido comentado para prevenir conflictos de migración.
 */

// Migración deshabilitada - usar 1757854509341_base.js como fuente única de verdad

export const shorthands = undefined;

export const up = (pgm) => {
  // Migración deshabilitada - no ejecutar
  console.log('[1757854614311_domain-schema] SALTADA - Migración consolidada en base.js');
};

export const down = (pgm) => {
  // Migración deshabilitada - no ejecutar
  console.log('[1757854614311_domain-schema] DOWN SALTADA - Migración consolidada');
};
