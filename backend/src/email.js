const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.BREVO_HOST,
  port: Number(process.env.BREVO_PORT),
  secure: false,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_PASS,
  },
});

const enviarEmail = async (destinatario, asunto, html) => {
  console.log('📧 INTENTANDO ENVIAR EMAIL A:', destinatario);

  try {
    await transporter.sendMail({
      from: '"Orbiport" <b882d8001@smtp-brevo.com>',
      to: destinatario,
      subject: asunto,
      html,
    });

    console.log('✅ EMAIL ENVIADO CORRECTAMENTE A:', destinatario);
  } catch (err) {
    console.error('❌ ERROR AL ENVIAR EMAIL:', err);
  }
};


module.exports = { enviarEmail };
