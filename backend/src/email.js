const enviarEmail = async (destinatario, asunto, html) => {
  console.log('📧 INTENTANDO ENVIAR EMAIL A:', destinatario);

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'Orbiport',
          email: process.env.BREVO_SENDER_EMAIL,
        },
        to: [
          {
            email: destinatario,
          },
        ],
        subject: asunto,
        htmlContent: html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ ERROR DE BREVO:', data);
      throw new Error(`Brevo API error: ${response.status}`);
    }

    console.log('✅ EMAIL ENVIADO CORRECTAMENTE A:', destinatario);
    console.log('📨 Brevo Message ID:', data.messageId);

    return data;
  } catch (err) {
    console.error('❌ ERROR AL ENVIAR EMAIL:', err);
    throw err;
  }
};

module.exports = { enviarEmail };