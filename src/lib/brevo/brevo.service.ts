import type { OtpPurpose } from '@/types/auth';

export interface OtpMailer {
  assertConfigured?(): void;
  sendOtpEmail(input: {
    to: string;
    name: string;
    code: string;
    purpose: OtpPurpose;
  }): Promise<void>;
}

function requireEnv(name: 'BREVO_API_KEY' | 'BREVO_SENDER_EMAIL' | 'BREVO_SENDER_NAME'): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be configured.`);
  return value;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    };
    return entities[character];
  });
}

export class BrevoService implements OtpMailer {
  assertConfigured(): void {
    requireEnv('BREVO_API_KEY');
    requireEnv('BREVO_SENDER_EMAIL');
    requireEnv('BREVO_SENDER_NAME');
  }

  async sendOtpEmail(input: {
    to: string;
    name: string;
    code: string;
    purpose: OtpPurpose;
  }): Promise<void> {
    this.assertConfigured();
    const subject = {
      EMAIL_VERIFICATION: 'Seu código de verificação do Viuê',
      PASSWORD_RESET: 'Seu código para redefinir a senha no Viuê',
      EMAIL_CHANGE: 'Seu código para confirmar o novo e-mail no Viuê',
    }[input.purpose];
    const action = {
      EMAIL_VERIFICATION: 'confirmar seu e-mail',
      PASSWORD_RESET: 'redefinir sua senha',
      EMAIL_CHANGE: 'confirmar seu novo e-mail',
    }[input.purpose];
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': requireEnv('BREVO_API_KEY'),
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          email: requireEnv('BREVO_SENDER_EMAIL'),
          name: requireEnv('BREVO_SENDER_NAME'),
        },
        to: [{ email: input.to, name: input.name }],
        subject,
        htmlContent: `<p>Olá, ${escapeHtml(input.name)}.</p><p>Use o código abaixo para ${action}:</p><p><strong style="font-size:24px;letter-spacing:4px">${input.code}</strong></p><p>O código expira em 10 minutos.</p>`,
      }),
    });

    if (!response.ok) {
      throw new Error(`Brevo request failed with status ${response.status}.`);
    }
  }
}
