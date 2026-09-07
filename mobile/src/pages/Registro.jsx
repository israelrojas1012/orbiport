import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useTheme } from '../context/ThemeContext';
import TerminosModal from '../components/TerminosModal';

export default function Registro() {
  const [paso, setPaso] = useState(1);
  const [form, setForm] = useState({ nombre: '', apellido: '', correo: '', contrasena: '' });
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [cargando, setCargando] = useState(false);
  const [aceptoTerminos, setAceptoTerminos] = useState(false);
  const [modalTerminos, setModalTerminos] = useState(false);
  const navigate = useNavigate();
  const { tema, cambiarTema } = useTheme();

  const handleRegistro = async () => {
    if (!aceptoTerminos) {
      setError('Debes aceptar los terminos y condiciones para continuar');
      return;
    }
    setError('');
    setCargando(true);
    try {
      await API.post('/auth/registro', { ...form, acepto_terminos: true });
      setExito('Código enviado a tu correo. Revísalo para verificar tu cuenta.');
      setPaso(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrarse');
    }
    setCargando(false);
  };

  const handleVerificar = async () => {
    if (!token) return setError('Ingresa el código');
    setError('');
    setCargando(true);
    try {
      await API.post('/auth/verificar', { correo: form.correo, token });
      setExito('Cuenta verificada. Redirigiendo...');
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al verificar');
    }
    setCargando(false);
  };

  return (
    <div style={styles.container}>
      {/* Modal de términos */}
      <TerminosModal
        abierto={modalTerminos}
        onCerrar={() => setModalTerminos(false)}
        onAceptar={() => { setAceptoTerminos(true); setModalTerminos(false); }}
        esAdmin={false}
      />

      {/* Toggle de tema */}
      <button
        onClick={cambiarTema}
        style={styles.toggleTema}
        aria-label="Cambiar tema"
      >
        {tema === 'light' ? '🌙' : '☀️'}
      </button>

      <div style={styles.card}>
        {/* Logo y bienvenida */}
        <div style={styles.logoWrap}>
          <div style={styles.logoIcon}>B</div>
          <h1 style={styles.titulo}>Orbiport</h1>
          <p style={styles.subtitulo}>
            {paso === 1 ? 'Crea tu cuenta' : 'Verifica tu correo'}
          </p>
        </div>

        {/* Indicador de pasos */}
        <div style={styles.steps}>
          <div style={{ ...styles.step, ...(paso >= 1 ? styles.stepActivo : {}) }}>
            <div style={{ ...styles.stepCirculo, ...(paso >= 1 ? styles.stepCirculoActivo : {}) }}>1</div>
            <span style={styles.stepLabel}>Datos</span>
          </div>
          <div style={{ ...styles.stepLinea, ...(paso >= 2 ? styles.stepLineaActiva : {}) }}></div>
          <div style={{ ...styles.step, ...(paso >= 2 ? styles.stepActivo : {}) }}>
            <div style={{ ...styles.stepCirculo, ...(paso >= 2 ? styles.stepCirculoActivo : {}) }}>2</div>
            <span style={styles.stepLabel}>Verificar</span>
          </div>
        </div>

        {/* Mensajes */}
        {error && (
          <div style={styles.errorBox}>
            <span style={styles.errorIcon}>⚠</span>
            <span>{error}</span>
          </div>
        )}
        {exito && (
          <div style={styles.exitoBox}>
            <span style={styles.exitoIcon}>✓</span>
            <span>{exito}</span>
          </div>
        )}

        {paso === 1 ? (
          <>
            <div style={styles.row}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nombre</label>
                <input
                  style={styles.input}
                  placeholder="Tu nombre"
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Apellido</label>
                <input
                  style={styles.input}
                  placeholder="Tu apellido"
                  value={form.apellido}
                  onChange={e => setForm({ ...form, apellido: e.target.value })}
                />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Correo electrónico</label>
              <input
                style={styles.input}
                placeholder="tu@correo.com"
                type="email"
                value={form.correo}
                onChange={e => setForm({ ...form, correo: e.target.value })}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Contraseña</label>
              <input
                style={styles.input}
                placeholder="••••••••"
                type="password"
                value={form.contrasena}
                onChange={e => setForm({ ...form, contrasena: e.target.value })}
              />
              <p style={styles.hint}>Letras y números, mínimo 6 caracteres</p>
            </div>

            {/* CHECKBOX TERMINOS Y CONDICIONES */}
            <div
              style={{
                ...styles.terminosBox,
                background: aceptoTerminos ? 'var(--color-primario-suave)' : 'var(--bg-hover)',
                borderColor: aceptoTerminos ? 'var(--color-primario-borde)' : 'var(--border-suave)',
              }}
              onClick={() => setAceptoTerminos(!aceptoTerminos)}
            >
              <div style={{
                ...styles.checkbox,
                background: aceptoTerminos ? 'var(--color-primario)' : 'transparent',
                borderColor: aceptoTerminos ? 'var(--color-primario)' : 'var(--border-medio)',
              }}>
                {aceptoTerminos && <span style={styles.checkmark}>✓</span>}
              </div>
              <p style={styles.terminosTexto}>
                Acepto los{' '}
                <span
                  style={styles.terminosLink}
                  onClick={(e) => { e.stopPropagation(); setModalTerminos(true); }}
                >
                  términos y condiciones
                </span>
                {' '}de Orbiport
              </p>
            </div>

            <button
              style={{
                ...styles.btn,
                opacity: cargando ? 0.7 : 1,
                cursor: cargando ? 'wait' : 'pointer'
              }}
              onClick={handleRegistro}
              disabled={cargando}
            >
              {cargando ? 'Registrando...' : 'Crear cuenta'}
            </button>
          </>
        ) : (
          <>
            <div style={styles.codigoInfo}>
              <p style={styles.codigoTexto}>
                Enviamos un código a
              </p>
              <p style={styles.codigoCorreo}>{form.correo}</p>
            </div>

            <input
              style={styles.inputCodigo}
              placeholder="XXXXXX"
              value={token}
              onChange={e => setToken(e.target.value.toUpperCase())}
              maxLength={6}
              autoFocus
            />

            <button
              style={{
                ...styles.btn,
                opacity: cargando ? 0.7 : 1,
                cursor: cargando ? 'wait' : 'pointer'
              }}
              onClick={handleVerificar}
              disabled={cargando}
            >
              {cargando ? 'Verificando...' : 'Verificar cuenta'}
            </button>

            <button
              style={styles.btnSecundario}
              onClick={() => { setPaso(1); setError(''); setExito(''); }}
            >
              ← Volver atrás
            </button>
          </>
        )}

        {/* Separador */}
        <div style={styles.separador}>
          <div style={styles.linea}></div>
          <span style={styles.separadorTexto}>o</span>
          <div style={styles.linea}></div>
        </div>

        <p style={styles.linkFooter}>
          ¿Ya tienes cuenta?{' '}
          <Link to="/" style={styles.linkBold}>
            Inicia sesión
          </Link>
        </p>

        {/* Info admin */}
        <div style={styles.infoBox}>
          <span style={styles.infoIcon}>💡</span>
          <p style={styles.infoTexto}>
            ¿Quieres registrar tu centro?{' '}
            <strong style={styles.infoBold}>Contáctanos</strong> y te creamos una cuenta de administrador.
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-app)',
    padding: '20px',
    position: 'relative',
    transition: 'background-color 0.3s ease',
  },
  toggleTema: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 'var(--radius-full)',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-suave)',
    fontSize: 20,
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-xl)',
    padding: '40px 32px',
    width: '100%',
    maxWidth: 440,
    boxShadow: 'var(--shadow-lg)',
    border: '1px solid var(--border-suave)',
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  logoWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  logoIcon: {
    width: 56,
    height: 56,
    borderRadius: 'var(--radius-md)',
    background: 'linear-gradient(135deg, var(--color-primario) 0%, var(--color-primario-hover) 100%)',
    color: '#fff',
    fontSize: 28,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 20px rgba(79, 70, 229, 0.3)',
    marginBottom: 8,
  },
  titulo: {
    fontSize: 28,
    fontWeight: 700,
    color: 'var(--text-principal)',
    letterSpacing: '-0.02em',
  },
  subtitulo: {
    fontSize: 15,
    color: 'var(--text-secundario)',
  },
  steps: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 4,
  },
  step: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    opacity: 0.5,
    transition: 'opacity 0.3s ease',
  },
  stepActivo: {
    opacity: 1,
  },
  stepCirculo: {
    width: 32,
    height: 32,
    borderRadius: 'var(--radius-full)',
    background: 'var(--bg-hover)',
    color: 'var(--text-suave)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 700,
    transition: 'all 0.3s ease',
  },
  stepCirculoActivo: {
    background: 'var(--color-primario)',
    color: '#fff',
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-secundario)',
  },
  stepLinea: {
    width: 60,
    height: 2,
    background: 'var(--border-suave)',
    marginBottom: 16,
    transition: 'background 0.3s ease',
  },
  stepLineaActiva: {
    background: 'var(--color-primario)',
  },
  errorBox: {
    padding: '12px 14px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-error)',
    fontSize: 13,
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  errorIcon: {
    fontSize: 16,
  },
  exitoBox: {
    padding: '12px 14px',
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-exito)',
    fontSize: 13,
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  exitoIcon: {
    fontSize: 16,
  },
  row: {
    display: 'flex',
    gap: 10,
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-secundario)',
  },
  input: {
    padding: '13px 16px',
    borderRadius: 'var(--radius-sm)',
    border: '1.5px solid var(--border-suave)',
    background: 'var(--bg-input)',
    color: 'var(--text-principal)',
    fontSize: 15,
    width: '100%',
  },
  inputCodigo: {
    padding: '20px 16px',
    borderRadius: 'var(--radius-md)',
    border: '1.5px solid var(--border-suave)',
    background: 'var(--bg-input)',
    color: 'var(--text-principal)',
    fontSize: 28,
    fontWeight: 700,
    textAlign: 'center',
    letterSpacing: '10px',
    width: '100%',
    fontFamily: 'monospace',
  },
  codigoInfo: {
    textAlign: 'center',
    padding: '14px',
    background: 'var(--color-primario-suave)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-primario-borde)',
  },
  codigoTexto: {
    fontSize: 13,
    color: 'var(--text-secundario)',
    marginBottom: 4,
  },
  codigoCorreo: {
    fontSize: 14,
    color: 'var(--color-primario)',
    fontWeight: 700,
  },
  hint: {
    fontSize: 11,
    color: 'var(--text-suave)',
    marginTop: 2,
  },
  // CHECKBOX TERMINOS
  terminosBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    userSelect: 'none',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 'var(--radius-sm)',
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.2s ease',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
  },
  terminosTexto: {
    fontSize: 13,
    color: 'var(--text-secundario)',
    lineHeight: 1.5,
    flex: 1,
  },
  terminosLink: {
    color: 'var(--color-primario)',
    fontWeight: 700,
    textDecoration: 'underline',
    cursor: 'pointer',
  },
  btn: {
    padding: '14px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'var(--color-primario)',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    marginTop: 4,
    transition: 'all 0.2s ease',
  },
  btnSecundario: {
    padding: '12px',
    borderRadius: 'var(--radius-sm)',
    border: '1.5px solid var(--border-suave)',
    background: 'transparent',
    color: 'var(--text-secundario)',
    fontSize: 13,
    fontWeight: 600,
  },
  separador: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    margin: '4px 0',
  },
  linea: {
    flex: 1,
    height: 1,
    background: 'var(--border-suave)',
  },
  separadorTexto: {
    fontSize: 12,
    color: 'var(--text-suave)',
    fontWeight: 500,
  },
  linkFooter: {
    textAlign: 'center',
    fontSize: 14,
    color: 'var(--text-secundario)',
  },
  linkBold: {
    color: 'var(--color-primario)',
    textDecoration: 'none',
    fontWeight: 700,
  },
  infoBox: {
    background: 'var(--bg-hover)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoIcon: {
    fontSize: 16,
  },
  infoTexto: {
    fontSize: 12,
    color: 'var(--text-secundario)',
    lineHeight: 1.5,
    flex: 1,
  },
  infoBold: {
    color: 'var(--color-primario)',
  },
};