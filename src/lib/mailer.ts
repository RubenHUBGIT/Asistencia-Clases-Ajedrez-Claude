import nodemailer from 'nodemailer';

function getTransport() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
}

// Sin SMTP configurado, no hay forma de entregar el correo: en desarrollo se
// registra el enlace en consola para poder probar el flujo; en producción se
// aborta con un error explícito para no fallar en silencio.
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const transport = getTransport();

  if (!transport) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SMTP no configurado: no se puede enviar el correo de restablecimiento.');
    }
    console.log(`[dev] Enlace de restablecimiento de contraseña para ${to}: ${resetUrl}`);
    return;
  }

  await transport.sendMail({
    from: process.env.SMTP_FROM ?? 'Asistencia Ajedrez <no-reply@example.com>',
    to,
    subject: 'Restablecer contraseña — Asistencia Ajedrez',
    text: `Para restablecer tu contraseña, visita el siguiente enlace (caduca pronto): ${resetUrl}`,
    html: `<p>Para restablecer tu contraseña, visita el siguiente enlace (caduca pronto):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });
}
