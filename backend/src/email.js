const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.BREVO_HOST,
  port: Number(process.env.BREVO_PORT),
  secure: false,
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_PASS,
  },
});

const enviarEmail = async (destinatario, asunto, html) => {
  try {
    await transporter.sendMail({
      from: '"Orbiport" <b882d8001@smtp-brevo.com>',
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
