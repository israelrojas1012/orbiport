const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const enviarEmail = async (destinatario, asunto, html) => {
  try {
    await transporter.sendMail({
      from: `"Orbiport" <${process.env.GMAIL_USER}>`,
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