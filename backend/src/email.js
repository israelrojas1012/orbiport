const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const enviarEmail = async (destinatario, asunto, html) => {
  try {
    await resend.emails.send({
      from: 'Orbiport <onboarding@resend.dev>',
      to: destinatario,
      subject: asunto,
      html,
    });
    console.log(`Email enviado a ${destinatario}`);
  } catch (err) {
    console.error('Error al enviar email:', err);
  }
};

module.exports = { enviarEmail };