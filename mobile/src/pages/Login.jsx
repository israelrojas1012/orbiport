import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useTheme } from '../context/ThemeContext';

export default function Login() {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();
  const { tema, cambiarTema } = useTheme();

  const handleLogin = async () => {
    if (!correo || !contrasena) {
      setError('Completa todos los campos');
      return;
    }
    setCargando(true);
    setError('');
    try {
      const res = await API.post('/auth/login', { correo, contrasena });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('usuario', JSON.stringify(res.data.usuario));
      if (res.data.usuario.rol === 'admin') {
        navigate('/admin');
      } else {
        navigate('/home');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesion');
    } finally {
      setCargando(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div style={styles.container}>
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
          <p style={styles.subtitulo}>Bienvenido de vuelta</p>
        </div>

        {/* Mensaje de error */}
        {error && (
          <div style={styles.errorBox}>
            <span style={styles.errorIcon}>⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Campo correo */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>Correo electrónico</label>
          <input
            style={styles.input}
            placeholder="tu@correo.com"
            value={correo}
            onChange={e => setCorreo(e.target.value)}
            onKeyDown={handleKeyDown}
            type="email"
            autoComplete="email"
          />
        </div>

        {/* Campo contraseña */}
        <div style={styles.inputGroup}>
          <div style={styles.labelRow}>
            <label style={styles.label}>Contraseña</label>
            <Link to="/recuperar" style={styles.linkSmall}>
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <input
            style={styles.input}
            placeholder="••••••••"
            type="password"
            value={contrasena}
            onChange={e => setContrasena(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="current-password"
          />
        </div>

        {/* Botón principal */}
        <button
          style={{
            ...styles.btn,
            opacity: cargando ? 0.7 : 1,
            cursor: cargando ? 'wait' : 'pointer'
          }}
          onClick={handleLogin}
          disabled={cargando}
        >
          {cargando ? 'Iniciando sesión...' : 'Iniciar sesión'}
        </button>

        {/* Separador */}
        <div style={styles.separador}>
          <div style={styles.linea}></div>
          <span style={styles.separadorTexto}>o</span>
          <div style={styles.linea}></div>
        </div>

        {/* Link a registro */}
        <p style={styles.linkFooter}>
          ¿No tienes cuenta?{' '}
          <Link to="/registro" style={styles.linkBold}>
            Regístrate
          </Link>
        </p>
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
    maxWidth: 420,
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
    marginBottom: 12,
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
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  btn: {
    padding: '14px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'var(--color-primario)',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    marginTop: 8,
    transition: 'all 0.2s ease',
  },
  separador: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    margin: '8px 0',
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
  linkSmall: {
    fontSize: 12,
    color: 'var(--color-primario)',
    textDecoration: 'none',
    fontWeight: 600,
  },
  linkBold: {
    color: 'var(--color-primario)',
    textDecoration: 'none',
    fontWeight: 700,
  },
};