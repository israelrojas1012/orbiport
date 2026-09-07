import { useState } from 'react';

export default function TerminosModal({ abierto, onCerrar, onAceptar, esAdmin = false, modoSoloLectura = false }) {
  const [scrollLeido, setScrollLeido] = useState(modoSoloLectura);

  if (!abierto) return null;

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollTop + clientHeight >= scrollHeight - 20) {
      setScrollLeido(true);
    }
  };

  return (
    <div style={styles.overlay} onClick={modoSoloLectura ? onCerrar : undefined}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.iconBox}>📄</div>
          <div style={{ flex: 1 }}>
            <h2 style={styles.titulo}>Términos y Condiciones</h2>
            <p style={styles.subtitulo}>
              {esAdmin ? 'Acuerdo para administradores' : 'Acuerdo de uso de Orbiport'}
            </p>
          </div>
          {modoSoloLectura && (
            <button style={styles.btnCerrarX} onClick={onCerrar}>✕</button>
          )}
        </div>

        {/* Contenido scrolleable */}
        <div style={styles.contenido} onScroll={handleScroll}>
          {esAdmin ? <TerminosAdmin /> : <TerminosCliente />}
        </div>

        {/* Footer con aviso de scroll y botones */}
        {!modoSoloLectura && (
          <div style={styles.footer}>
            {!scrollLeido && (
              <div style={styles.avisoScroll}>
                <span>↓</span>
                <span>Por favor, lee todos los términos hasta el final</span>
              </div>
            )}
            <div style={styles.botones}>
              <button style={styles.btnRechazar} onClick={onCerrar}>
                Cancelar
              </button>
              <button
                style={{
                  ...styles.btnAceptar,
                  opacity: scrollLeido ? 1 : 0.5,
                  cursor: scrollLeido ? 'pointer' : 'not-allowed',
                }}
                onClick={scrollLeido ? onAceptar : undefined}
                disabled={!scrollLeido}
              >
                {scrollLeido ? '✓ Acepto los términos' : 'Lee los términos primero'}
              </button>
            </div>
          </div>
        )}

        {modoSoloLectura && (
          <div style={styles.footer}>
            <button style={styles.btnCerrar} onClick={onCerrar}>
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// TERMINOS PARA CLIENTE
function TerminosCliente() {
  return (
    <div style={styles.textoContenido}>
      <p style={styles.fechaActualizacion}>Última actualización: junio 2026</p>

      <h3 style={styles.h3}>1. Aceptación del acuerdo</h3>
      <p style={styles.parrafo}>
        Al registrarte y usar Orbiport, aceptas los presentes términos y condiciones. Si no estás de acuerdo con alguno de ellos, no debes utilizar la aplicación.
      </p>

      <h3 style={styles.h3}>2. Descripción del servicio</h3>
      <p style={styles.parrafo}>
        Orbiport es una plataforma digital que conecta a usuarios con centros deportivos (gimnasios, canchas, centros de crossfit, etc.) para realizar reservas de horarios disponibles. Orbiport no es propietaria de los centros listados y actúa únicamente como intermediario tecnológico.
      </p>

      <h3 style={styles.h3}>3. Registro y cuenta</h3>
      <p style={styles.parrafo}>
        Para usar el servicio, debes proporcionar información veraz: nombre completo y correo electrónico válido. Eres responsable de mantener la confidencialidad de tu contraseña. Toda actividad realizada desde tu cuenta es tu responsabilidad.
      </p>

      <h3 style={styles.h3}>4. Inscripción a centros</h3>
      <p style={styles.parrafo}>
        Para reservar horarios en un centro, debes solicitar inscripción. Cada centro decide si aprueba o rechaza tu solicitud. Orbiport no garantiza la aceptación de ninguna inscripción.
      </p>

      <h3 style={styles.h3}>5. Reservas y cancelaciones</h3>
      <p style={styles.parrafo}>
        <strong>Anticipación:</strong> Las reservas y cancelaciones deben realizarse con al menos 2 horas de anticipación al inicio del horario.
      </p>
      <p style={styles.parrafo}>
        <strong>Cupos:</strong> Los horarios tienen cupos limitados que se asignan por orden de reserva.
      </p>
      <p style={styles.parrafo}>
        <strong>Compromiso:</strong> Al reservar, te comprometes a asistir. Las faltas injustificadas generan penalizaciones (ver siguiente sección).
      </p>

      <h3 style={styles.h3}>6. Penalizaciones por inasistencia</h3>
      <p style={styles.parrafo}>
        Si reservas un horario y no asistes sin cancelar con anticipación, se te aplicará una penalización de <strong>$0.25 USD por cada falta</strong>. Estas penalizaciones se acumulan en tu cuenta y deben ser pagadas directamente al administrador del centro correspondiente. Orbiport no procesa pagos.
      </p>

      <h3 style={styles.h3}>7. Responsabilidad del usuario</h3>
      <p style={styles.parrafo}>
        Eres responsable de tu propia salud física y de las condiciones para realizar actividad deportiva. Orbiport y los centros no se hacen responsables por lesiones u otros daños sufridos durante la práctica deportiva.
      </p>

      <h3 style={styles.h3}>8. Protección de datos personales</h3>
      <p style={styles.parrafo}>
        Orbiport recopila únicamente los datos necesarios para el funcionamiento del servicio: nombre, apellido y correo electrónico. Estos datos son compartidos solamente con los administradores de los centros a los que te inscribes, para que puedan gestionar las reservas.
      </p>
      <p style={styles.parrafo}>
        Tus datos no se venden ni comparten con terceros con fines comerciales. Las contraseñas se almacenan cifradas. Tienes derecho a solicitar la eliminación de tu cuenta en cualquier momento.
      </p>

      <h3 style={styles.h3}>9. Notificaciones</h3>
      <p style={styles.parrafo}>
        Al registrarte, autorizas a Orbiport a enviarte correos electrónicos relacionados con tu cuenta: verificación, recuperación de contraseña, confirmaciones de reservas, avisos de faltas y notificaciones del administrador del centro.
      </p>

      <h3 style={styles.h3}>10. Uso adecuado</h3>
      <p style={styles.parrafo}>
        Está prohibido utilizar Orbiport para fines ilegales, suplantar la identidad de otros usuarios, intentar vulnerar la seguridad de la plataforma o causar perjuicio a otros usuarios o centros. El incumplimiento puede resultar en la suspensión de tu cuenta.
      </p>

      <h3 style={styles.h3}>11. Modificaciones</h3>
      <p style={styles.parrafo}>
        Orbiport se reserva el derecho de modificar estos términos en cualquier momento. Los cambios entrarán en vigor desde su publicación. El uso continuado del servicio implica la aceptación de los términos actualizados.
      </p>

      <h3 style={styles.h3}>12. Contacto</h3>
      <p style={styles.parrafo}>
        Para consultas, soporte o ejercer tus derechos sobre tus datos personales, escribe a: <strong>biro20001021@gmail.com</strong>
      </p>

      <div style={styles.notaFinal}>
        <p style={{ fontSize: 12, color: 'var(--text-suave)', fontStyle: 'italic', textAlign: 'center' }}>
          Al aceptar estos términos, declaras haber leído y comprendido el presente acuerdo.
        </p>
      </div>
    </div>
  );
}

// TERMINOS PARA ADMINISTRADOR
function TerminosAdmin() {
  return (
    <div style={styles.textoContenido}>
      <p style={styles.fechaActualizacion}>Última actualización: junio 2026</p>

      <div style={styles.cajaImportante}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primario)' }}>
          ⚠️ Como administrador de un centro deportivo en Orbiport, tienes responsabilidades adicionales. Léelas con atención.
        </p>
      </div>

      <h3 style={styles.h3}>1. Rol del administrador</h3>
      <p style={styles.parrafo}>
        Como administrador, eres responsable de gestionar la información, horarios, inscripciones y asistencia del centro deportivo que representas en Orbiport. Tu cuenta es personal e intransferible.
      </p>

      <h3 style={styles.h3}>2. Veracidad de la información</h3>
      <p style={styles.parrafo}>
        Te comprometes a mantener actualizada y veraz toda la información del centro: nombre, dirección, teléfono, fotos, horarios y disponibilidad de cupos. Información falsa puede resultar en la suspensión inmediata de la cuenta del centro.
      </p>

      <h3 style={styles.h3}>3. Gestión de inscripciones</h3>
      <p style={styles.parrafo}>
        Tienes la potestad de aprobar o rechazar solicitudes de inscripción de usuarios al centro. Debes hacerlo con criterios justos y no discriminatorios. No puedes rechazar solicitudes por motivos de raza, género, religión, orientación sexual o cualquier característica protegida por la ley.
      </p>

      <h3 style={styles.h3}>4. Asistencia y penalizaciones</h3>
      <p style={styles.parrafo}>
        Eres responsable de marcar la asistencia o falta de los usuarios reservados, de forma honesta y oportuna. Las penalizaciones por inasistencia ($0.25 USD por falta) se cobran directamente entre el centro y el usuario; Orbiport no participa en la transacción económica.
      </p>

      <h3 style={styles.h3}>5. Cobro de penalizaciones</h3>
      <p style={styles.parrafo}>
        Tienes la responsabilidad de cobrar las penalizaciones acumuladas a tus usuarios. Una vez recibido el pago, debes registrarlo correctamente en el panel de Orbiport para mantener actualizados los saldos.
      </p>

      <h3 style={styles.h3}>6. Datos de los usuarios</h3>
      <p style={styles.parrafo}>
        Los datos personales de los usuarios inscritos en tu centro (nombre, apellido, correo) están protegidos. Solo puedes usarlos para fines relacionados con la gestión del centro. <strong>Está prohibido</strong> compartir, vender o usar estos datos para envío de publicidad no solicitada o cualquier otro fin ajeno al servicio.
      </p>

      <h3 style={styles.h3}>7. Comunicación con usuarios</h3>
      <p style={styles.parrafo}>
        Las notificaciones automáticas (faltas, aprobaciones, rechazos) se envían a través de Orbiport. Para comunicaciones adicionales, debes usar canales fuera de la plataforma con consentimiento del usuario.
      </p>

      <h3 style={styles.h3}>8. Operación del centro</h3>
      <p style={styles.parrafo}>
        Orbiport es solo una herramienta de gestión de reservas. El funcionamiento, la calidad del servicio, las instalaciones, el equipamiento, los instructores y la seguridad del centro deportivo son responsabilidad exclusiva del centro, no de Orbiport.
      </p>

      <h3 style={styles.h3}>9. Responsabilidad legal</h3>
      <p style={styles.parrafo}>
        Cualquier disputa legal, reclamo o litigio originado entre el centro y los usuarios inscritos es responsabilidad del centro. Orbiport no se involucra en disputas, salvo para colaborar como intermediario tecnológico cuando sea solicitado.
      </p>

      <h3 style={styles.h3}>10. Confidencialidad</h3>
      <p style={styles.parrafo}>
        Las credenciales de acceso al panel de administrador son confidenciales y personales. No debes compartirlas con terceros. Cualquier acción realizada desde tu cuenta es tu responsabilidad.
      </p>

      <h3 style={styles.h3}>11. Suspensión de cuenta</h3>
      <p style={styles.parrafo}>
        Orbiport puede suspender la cuenta de un administrador en caso de incumplimiento de estos términos, mal uso de la plataforma, denuncias verificadas de usuarios o cualquier conducta que perjudique a otros usuarios o a la comunidad de Orbiport.
      </p>

      <h3 style={styles.h3}>12. Comisiones y modelo de negocio</h3>
      <p style={styles.parrafo}>
        Actualmente, el uso de Orbiport como administrador es gratuito. En el futuro podrían aplicarse comisiones o planes de pago, los cuales serán comunicados con anticipación a los administradores activos.
      </p>

      <h3 style={styles.h3}>13. Contacto</h3>
      <p style={styles.parrafo}>
        Para soporte técnico, consultas o ejercer derechos sobre la información del centro, contacta a: <strong>biro20001021@gmail.com</strong>
      </p>

      <div style={styles.notaFinal}>
        <p style={{ fontSize: 12, color: 'var(--text-suave)', fontStyle: 'italic', textAlign: 'center' }}>
          Al aceptar estos términos, te comprometes formalmente a cumplir con las responsabilidades de administrador en Orbiport.
        </p>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.65)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    padding: '20px',
  },
  modal: {
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-xl)',
    width: '100%',
    maxWidth: 560,
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid var(--border-suave)',
    boxShadow: 'var(--shadow-lg)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '20px 24px',
    borderBottom: '1px solid var(--border-suave)',
    background: 'var(--bg-card)',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 'var(--radius-md)',
    background: 'var(--color-primario-suave)',
    border: '1px solid var(--color-primario-borde)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    flexShrink: 0,
  },
  titulo: {
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--text-principal)',
    letterSpacing: '-0.02em',
  },
  subtitulo: {
    fontSize: 13,
    color: 'var(--text-secundario)',
    marginTop: 2,
  },
  btnCerrarX: {
    width: 32,
    height: 32,
    borderRadius: 'var(--radius-full)',
    background: 'var(--bg-hover)',
    border: 'none',
    fontSize: 14,
    color: 'var(--text-secundario)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contenido: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 24px',
  },
  textoContenido: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  fechaActualizacion: {
    fontSize: 12,
    color: 'var(--text-suave)',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  cajaImportante: {
    background: 'var(--color-primario-suave)',
    border: '1px solid var(--color-primario-borde)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 14px',
    marginBottom: 12,
  },
  h3: {
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--text-principal)',
    marginTop: 14,
    marginBottom: 6,
    letterSpacing: '-0.01em',
  },
  parrafo: {
    fontSize: 13,
    color: 'var(--text-secundario)',
    lineHeight: 1.6,
    marginBottom: 6,
  },
  notaFinal: {
    marginTop: 16,
    padding: '12px',
    background: 'var(--bg-hover)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-suave)',
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid var(--border-suave)',
    background: 'var(--bg-card)',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  avisoScroll: {
    fontSize: 12,
    color: 'var(--color-advertencia)',
    fontWeight: 600,
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '6px',
    background: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.2)',
    borderRadius: 'var(--radius-sm)',
  },
  botones: {
    display: 'flex',
    gap: 8,
  },
  btnRechazar: {
    flex: 1,
    padding: '12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-suave)',
    background: 'transparent',
    color: 'var(--text-secundario)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnAceptar: {
    flex: 2,
    padding: '12px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'var(--color-primario)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    transition: 'all 0.2s ease',
  },
  btnCerrar: {
    padding: '12px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'var(--color-primario)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    width: '100%',
  },
};