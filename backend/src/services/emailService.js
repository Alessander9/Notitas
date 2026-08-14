import dotenv from 'dotenv';

dotenv.config();

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const APP_EMAIL_FROM = process.env.APP_EMAIL_FROM || 'Notitas <onboarding@resend.dev>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://notitas-cleo.vercel.app';

export const sendPasswordResetEmail = async (email, resetToken) => {
  const resetLink = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

  if (!RESEND_API_KEY) {
    console.log(`[DEV MODE] Password reset link for ${email}: ${resetLink}`);
    return { success: true, devLink: resetLink };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: APP_EMAIL_FROM,
        to: [email],
        subject: 'Recuperación de contraseña - Notitas',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b;">
            <h2 style="color: #386c5f;">Recuperación de Contraseña</h2>
            <p>Has solicitado restablecer tu contraseña en <strong>Notitas</strong>.</p>
            <p>Haz clic en el siguiente botón para crear una nueva contraseña. Este enlace expira en 1 hora:</p>
            <div style="margin: 32px 0;">
              <a href="${resetLink}" style="background-color: #386c5f; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Restablecer mi contraseña
              </a>
            </div>
            <p style="color: #64748b; font-size: 0.85rem;">Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errData = await response.text();
      console.error('Failed to send email via Resend:', errData);
      return { success: false, error: errData };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending reset email:', error);
    return { success: false, error: error.message };
  }
};
