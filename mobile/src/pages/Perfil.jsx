import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../services/api';
import { useTheme } from '../context/ThemeContext';
import ConfirmarSalida from '../components/ConfirmarSalida';


export default function Perfil() {
  const navigate = useNavigate();
  const location = useLocation();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ nombre: usuario.nombre || '', apellido: usuario.apellido || '' });
  const [passForm, setPassForm] = useState({ actual: '', nueva: '', confirmar: '' });
  const [editandoPass, setEditandoPass] = useState(false);
  const [mostrarActual, setMostrarActual] = useState(false);
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [toast, setToast] = useState(null);
  const [saldo, setSaldo] = useState(null);
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);
  const [mostrarNotif, setMostrarNotif] = useState(false);
  const { tema, cambiarTema } = useTheme();

  useEffect(() => {
    API.get(`/usuarios/${usuario.id}/saldo`)
      .then(res => setSaldo(res.data))
      .catch(() => {});

    API.get(`/notificaciones/${usuario.id}`)
      .then(res => setNotificaciones(res.data))
      .catch(() => {});
  }, []);

  const mostrarToast = (msg, tipo = 'exito') => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3000);
  };

  const guardarPerfil = async () => {
    try {
      await API.put(`/usuarios/${usuario.id}`, form);
      const actualizado = { ...usuario, ...form };
      localStorage.setItem('usuario', JSON.stringify(actualizado));
      setEditando(false);
      mostrarToast('Perfil actualizado correctamente');
    } catch (err) {
      mostrarToast(err.response?.data?.error || 'Error al actualizar', 'error');
    }
  };

  const cambiarPassword = async () => {
    if (!passForm.actual || !passForm.nueva || !passForm.confirmar) {
      mostrarToast('Completa todos los campos', 'error');
      return;
    }
    if (passForm.nueva !== passForm.confirmar) {
      mostrarToast('Las contraseñas no coinciden', 'error');
      return;
    }
    const contrasenaRegex = /^(?=.*[a-zA-Z])(?=.*[0-9]).{6,}$/;
    if (!contrasenaRegex.test(passForm.nueva)) {
      mostrarToast('La nueva contraseña debe tener letras y números, mínimo 6 caracteres', 'error');
      return;
    }
    try {
      await API.put(`/usuarios/${usuario.id}/password`, passForm);
      setPassForm({ actual: '', nueva: '', confirmar: '' });
      setEditandoPass(false);
      mostrarToast('Contraseña actualizada correctamente');
    } catch (err) {
      mostrarToast(err.response?.data?.error || 'Error al cambiar contraseña', 'error');
    }
  };

  const noLeidas = notificaciones.filter(n => !n.leida).length;

  const marcarTodasLeidas = async () => {
    try {
      await API.put(`/notificaciones/leer/todas/${usuario.id}`);
      setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
    } catch (err) {}
  };

  const cerrarSesion = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div style={styles.container}>
      <ConfirmarSalida
        abierto={confirmarSalida}
        onCancelar={() => setConfirmarSalida(false)}
        onConfirmar={cerrarSesion}
      />
      {toast && (
        <div style={{
          ...styles.toast,
          background: toast.tipo === 'error' ? 'var(--color-error)' : 'var(--color-exito)'
        }}>
          <span style={styles.toastIcon}>
            {toast.tipo === 'error' ? '⚠' : '✓'}
          </span>
          {toast.msg}
        </div>
      )}

      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <p style={styles.headerSubtitulo}>Cuenta</p>
          <h2 style={styles.headerTitulo}>Mi Perfil</h2>
        </div>

        <div style={styles.headerAcciones}>
          <button
            onClick={cambiarTema}
            style={styles.iconBtn}
            aria-label="Cambiar tema"
          >
            {tema === 'light' ? '🌙' : '☀️'}
          </button>

          <button
            style={styles.iconBtn}
            onClick={() => {
              setMostrarNotif(!mostrarNotif);
              if (!mostrarNotif) marcarTodasLeidas();
            }}
            aria-label="Notificaciones"
          >
            🔔
            {noLeidas > 0 && (
              <span style={styles.badge}>{noLeidas}</span>
            )}
          </button>

          <button
            style={styles.btnSalir}
            onClick={() => setConfirmarSalida(true)}
            aria-label="Cerrar sesión"
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v9" />
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
            </svg>
          </button>
        </div>
      </div>

      {mostrarNotif && (
        <div style={styles.notifPanel}>
          <div style={styles.notifHeader}>
            <p style={styles.notifTitulo}>Notificaciones</p>

            <button
              style={styles.notifCerrar}
              onClick={() => setMostrarNotif(false)}
            >
              ✕
            </button>
          </div>

          {notificaciones.length === 0 ? (
            <div style={styles.notifVacio}>
              <p style={{ fontSize: 32 }}>🔔</p>
              <p>No tienes notificaciones</p>
            </div>
          ) : (
            <div style={styles.notifLista}>
              {notificaciones.map(n => (
                <div
                  key={n.id}
                  style={{
                    ...styles.notifItem,
                    background: n.leida
                      ? 'var(--bg-card)'
                      : 'var(--color-primario-suave)',
                    borderColor: n.leida
                      ? 'var(--border-suave)'
                      : 'var(--color-primario-borde)',
                  }}
                >
                  {!n.leida && <div style={styles.notifPunto}></div>}

                  <div style={{ flex: 1 }}>
                    <p style={styles.notifMensaje}>{n.mensaje}</p>

                    <p style={styles.notifFecha}>
                      {new Date(n.creado_en).toLocaleDateString(
                        'es-EC',
                        {
                          day: 'numeric',
                          month: 'long',
                          hour: '2-digit',
                          minute: '2-digit'
                        }
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={styles.content}>
        {/* Avatar y nombre */}
        <div style={styles.avatarSeccion}>
          <div style={styles.avatar}>
            <span style={styles.avatarLetra}>{usuario.nombre?.charAt(0).toUpperCase()}</span>
          </div>
          <h3 style={styles.nombre}>{usuario.nombre} {usuario.apellido}</h3>
          <div style={styles.rolBadge}>
            <span style={styles.rolIcon}>{usuario.rol === 'admin' ? '⚙️' : '👤'}</span>
            <span style={styles.rolTexto}>{usuario.rol === 'admin' ? 'Administrador' : 'Cliente'}</span>
          </div>
        </div>

        {/* Saldos pendientes */}
        {saldo && parseFloat(saldo.saldo_pendiente) > 0 && (
          <div style={styles.cardSaldo}>
            <div style={styles.saldoHeader}>
              <div style={styles.saldoIconBox}>
                <span style={styles.saldoIcon}>💳</span>
              </div>
              <div style={{ flex: 1 }}>
                <p style={styles.saldoTitulo}>Saldos pendientes</p>
                <p style={styles.saldoSubtitulo}>Tienes pagos por realizar</p>
              </div>
            </div>

            <div style={styles.saldoResumen}>
              <div style={styles.saldoItem}>
                <p style={styles.saldoLabel}>Faltas totales</p>
                <p style={styles.saldoNumero}>{saldo.total_faltas || 0}</p>
              </div>
              <div style={styles.saldoDivider}></div>
              <div style={styles.saldoItem}>
                <p style={styles.saldoLabel}>Total a pagar</p>
                <p style={styles.saldoMonto}>${parseFloat(saldo.saldo_pendiente).toFixed(2)}</p>
              </div>
            </div>

            {saldo.por_lugar && saldo.por_lugar.length > 0 && (
              <div style={styles.saldoDetalle}>
                <p style={styles.saldoDetalleTitulo}>Detalle por lugar</p>
                {saldo.por_lugar.map(l => (
                  <div key={l.lugar_id} style={styles.saldoLugar}>
                    <div style={styles.saldoLugarHeader}>
                      <p style={styles.saldoLugarNombre}>{l.lugar_nombre}</p>
                      <p style={styles.saldoLugarMonto}>${parseFloat(l.saldo_pendiente).toFixed(2)}</p>
                    </div>
                    <p style={styles.saldoLugarFaltas}>{l.total_faltas} falta{l.total_faltas !== 1 ? 's' : ''}</p>
                    {l.lugar_telefono && (
                      <a href={`https://wa.me/593${l.lugar_telefono.replace(/[^0-9]/g, '').replace(/^0/, '')}`} target="_blank" rel="noopener noreferrer" style={styles.saldoLugarTelefono}>
                        💬 Contactar al {l.lugar_telefono}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
            <p style={styles.saldoNota}>Contacta al administrador de cada lugar para pagar</p>
          </div>
        )}

        {/* Datos personales */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <p style={styles.cardTitulo}>Datos personales</p>
              <p style={styles.cardSubtitulo}>Tu información básica</p>
            </div>
            {!editando && (
              <button style={styles.btnEditar} onClick={() => setEditando(true)}>
                Editar
              </button>
            )}
          </div>

          {editando ? (
            <div style={styles.formGroup}>
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
              <div style={styles.infoBox}>
                <p style={styles.infoBoxLabel}>Correo electrónico (no editable)</p>
                <p style={styles.infoBoxValor}>{usuario.correo}</p>
              </div>
              <div style={styles.botonesRow}>
                <button style={styles.btnGuardar} onClick={guardarPerfil}>
                  Guardar cambios
                </button>
                <button
                  style={styles.btnCancelar}
                  onClick={() => { setEditando(false); setForm({ nombre: usuario.nombre, apellido: usuario.apellido }); }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div style={styles.infoLista}>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Nombre</span>
                <span style={styles.infoValor}>{usuario.nombre}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Apellido</span>
                <span style={styles.infoValor}>{usuario.apellido}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Correo</span>
                <span style={styles.infoValorPequeno}>{usuario.correo}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>ID de usuario</span>
                <span style={styles.infoValor}>#{usuario.id}</span>
              </div>
              <div style={{ ...styles.infoRow, borderBottom: 'none' }}>
                <span style={styles.infoLabel}>Tipo de cuenta</span>
                <span style={styles.infoValor}>{usuario.rol === 'admin' ? 'Administrador' : 'Cliente'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Contraseña */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <p style={styles.cardTitulo}>Seguridad</p>
              <p style={styles.cardSubtitulo}>Contraseña de acceso</p>
            </div>
            {!editandoPass && (
              <button style={styles.btnEditar} onClick={() => setEditandoPass(true)}>
                Cambiar
              </button>
            )}
          </div>

          {editandoPass ? (
            <div style={styles.formGroup}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Contraseña actual</label>
                <div style={styles.passwordWrap}>
                  <input
                    style={styles.passwordInput}
                    type={mostrarActual ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={passForm.actual}
                    onChange={e => setPassForm({ ...passForm, actual: e.target.value })}
                  />
                  <button
                    type="button"
                    style={styles.togglePassword}
                    onClick={() => setMostrarActual(!mostrarActual)}
                    aria-label={mostrarActual ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {mostrarActual ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Nueva contraseña</label>
                <div style={styles.passwordWrap}>
                  <input
                    style={styles.passwordInput}
                    type={mostrarNueva ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={passForm.nueva}
                    onChange={e => setPassForm({ ...passForm, nueva: e.target.value })}
                  />
                  <button
                    type="button"
                    style={styles.togglePassword}
                    onClick={() => setMostrarNueva(!mostrarNueva)}
                    aria-label={mostrarNueva ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {mostrarNueva ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Confirmar nueva contraseña</label>
                <div style={styles.passwordWrap}>
                  <input
                    style={styles.passwordInput}
                    type={mostrarConfirmar ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={passForm.confirmar}
                    onChange={e => setPassForm({ ...passForm, confirmar: e.target.value })}
                  />
                  <button
                    type="button"
                    style={styles.togglePassword}
                    onClick={() => setMostrarConfirmar(!mostrarConfirmar)}
                    aria-label={mostrarConfirmar ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {mostrarConfirmar ? '🙈' : '👁️'}
                  </button>
                </div>
                <p style={styles.hint}>Letras y números, mínimo 6 caracteres</p>
              </div>

              <div style={styles.botonesRow}>
                <button style={styles.btnGuardar} onClick={cambiarPassword}>
                  Guardar
                </button>
                <button
                  style={styles.btnCancelar}
                  onClick={() => {
                    setEditandoPass(false);
                    setPassForm({ actual: '', nueva: '', confirmar: '' });
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div style={styles.passDisplay}>
              <span style={styles.passDots}>••••••••</span>
            </div>
          )}
        </div>

      </div>



      {/* NAVBAR */}
      <div style={styles.navbar}>
        <button
          style={{
            ...styles.navBtn,
            color: location.pathname === '/home' ? 'var(--color-primario)' : 'var(--text-suave)',
            background: location.pathname === '/home' ? 'var(--color-primario-suave)' : 'transparent',
          }}
          onClick={() => navigate('/home')}
        >
          <span style={styles.navIcon}>🏠</span>
          <span style={styles.navLabel}>Inicio</span>
        </button>
        <button
          style={{
            ...styles.navBtn,
            color: location.pathname === '/mis-reservas' ? 'var(--color-primario)' : 'var(--text-suave)',
            background: location.pathname === '/mis-reservas' ? 'var(--color-primario-suave)' : 'transparent',
          }}
          onClick={() => navigate('/mis-reservas')}
        >
          <span style={styles.navIcon}>📅</span>
          <span style={styles.navLabel}>Mis Reservas</span>
        </button>
        <button
          style={{
            ...styles.navBtn,
            color: location.pathname === '/perfil' ? 'var(--color-primario)' : 'var(--text-suave)',
            background: location.pathname === '/perfil' ? 'var(--color-primario-suave)' : 'transparent',
          }}
          onClick={() => navigate('/perfil')}
        >
          <span style={styles.navIcon}>👤</span>
          <span style={styles.navLabel}>Perfil</span>
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'var(--bg-app)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'background-color 0.3s ease',
  },

  toast: {
    position: 'fixed',
    top: 20,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 999,
    padding: '12px 20px',
    borderRadius: 'var(--radius-md)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    boxShadow: 'var(--shadow-lg)',
    maxWidth: '90%',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },

  toastIcon: {
    fontSize: 16,
  },

  header: {
    background: 'var(--bg-card)',
    padding: '20px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--border-suave)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },

  headerSubtitulo: {
    fontSize: 13,
    color: 'var(--text-secundario)',
    fontWeight: 500,
    marginBottom: 2,
  },

  headerTitulo: {
    fontSize: 20,
    fontWeight: 700,
    color: 'var(--text-principal)',
    letterSpacing: '-0.02em',
  },

  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    background: 'var(--color-error)',
    color: '#fff',
    fontSize: 10,
    fontWeight: 700,
    minWidth: 18,
    height: 18,
    borderRadius: 'var(--radius-full)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 5px',
    border: '2px solid var(--bg-card)',
  },

  notifPanel: {
    background: 'var(--bg-card)',
    borderBottom: '1px solid var(--border-suave)',
    padding: '16px 24px',
    maxHeight: 400,
    overflowY: 'auto',
    boxShadow: 'var(--shadow-md)',
  },

  notifHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  notifTitulo: {
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--text-principal)',
  },

  notifCerrar: {
    width: 28,
    height: 28,
    borderRadius: 'var(--radius-full)',
    background: 'var(--bg-hover)',
    border: 'none',
    color: 'var(--text-secundario)',
    fontSize: 14,
    cursor: 'pointer',
  },

  notifLista: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },

  notifVacio: {
    fontSize: 13,
    color: 'var(--text-suave)',
    textAlign: 'center',
    padding: '24px 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },

  notifItem: {
    padding: '12px 14px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
  },

  notifPunto: {
    width: 8,
    height: 8,
    borderRadius: 'var(--radius-full)',
    background: 'var(--color-primario)',
    marginTop: 6,
    flexShrink: 0,
  },

  notifMensaje: {
    fontSize: 13,
    color: 'var(--text-principal)',
    lineHeight: 1.5,
  },

  notifFecha: {
    fontSize: 11,
    color: 'var(--text-suave)',
    marginTop: 4,
  },

  iconBtn: {
    position: 'relative',
    width: 42,
    height: 42,
    borderRadius: 'var(--radius-full)',
    background: 'var(--bg-hover)',
    border: '1px solid var(--border-suave)',
    fontSize: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },

  headerAcciones: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },

  btnSalirIcono: {
    width: 42,
    height: 42,
    borderRadius: 'var(--radius-full)',
    background: 'var(--bg-hover)',
    color: 'var(--color-error)',
    border: '1px solid var(--border-suave)',
    fontSize: 17,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },

  content: {
    flex: 1,
    padding: '20px 20px 100px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
  },

  avatarSeccion: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },

  avatar: {
    width: 96,
    height: 96,
    borderRadius: 'var(--radius-full)',
    background: 'linear-gradient(135deg, var(--color-primario) 0%, var(--color-primario-hover) 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 10px 30px rgba(79, 70, 229, 0.35)',
  },

  avatarLetra: {
    fontSize: 42,
    color: '#fff',
    fontWeight: 700,
    letterSpacing: '-0.02em',
  },

  nombre: {
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--text-principal)',
    letterSpacing: '-0.02em',
  },

  rolBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    background: 'var(--color-primario-suave)',
    border: '1px solid var(--color-primario-borde)',
    borderRadius: 'var(--radius-full)',
  },

  rolIcon: {
    fontSize: 13,
  },

  rolTexto: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--color-primario)',
  },

  card: {
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)',
    padding: '18px 20px',
    width: '100%',
    maxWidth: 440,
    border: '1px solid var(--border-suave)',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },

  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  cardTitulo: {
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--text-principal)',
  },

  cardSubtitulo: {
    fontSize: 12,
    color: 'var(--text-suave)',
    marginTop: 2,
  },

  btnEditar: {
    background: 'var(--bg-hover)',
    border: '1px solid var(--border-suave)',
    borderRadius: 'var(--radius-sm)',
    padding: '7px 14px',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-secundario)',
  },

  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },

  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },

  label: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-secundario)',
  },

  input: {
    padding: '11px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1.5px solid var(--border-suave)',
    background: 'var(--bg-input)',
    color: 'var(--text-principal)',
    fontSize: 14,
    width: '100%',
  },

  passwordWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },

  passwordInput: {
    padding: '11px 14px',
    paddingRight: 48,
    borderRadius: 'var(--radius-sm)',
    border: '1.5px solid var(--border-suave)',
    background: 'var(--bg-input)',
    color: 'var(--text-principal)',
    fontSize: 14,
    width: '100%',
  },

  togglePassword: {
    position: 'absolute',
    right: 10,
    width: 32,
    height: 32,
    border: 'none',
    background: 'transparent',
    color: 'var(--text-secundario)',
    fontSize: 17,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
  },

  hint: {
    fontSize: 11,
    color: 'var(--text-suave)',
    marginTop: 2,
  },

  infoBox: {
    background: 'var(--bg-hover)',
    borderRadius: 'var(--radius-sm)',
    padding: '11px 14px',
    border: '1px solid var(--border-suave)',
  },

  infoBoxLabel: {
    fontSize: 11,
    color: 'var(--text-suave)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  infoBoxValor: {
    fontSize: 14,
    color: 'var(--text-secundario)',
    marginTop: 4,
  },

  botonesRow: {
    display: 'flex',
    gap: 8,
  },

  btnGuardar: {
    flex: 1,
    padding: '11px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'var(--color-primario)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },

  btnCancelar: {
    flex: 1,
    padding: '11px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-suave)',
    background: 'transparent',
    color: 'var(--text-secundario)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },

  infoLista: {
    display: 'flex',
    flexDirection: 'column',
  },

  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--border-suave)',
    padding: '11px 0',
  },

  infoLabel: {
    fontSize: 13,
    color: 'var(--text-secundario)',
  },

  infoValor: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-principal)',
  },

  infoValorPequeno: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-principal)',
  },

  passDisplay: {
    padding: '14px 16px',
    background: 'var(--bg-hover)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-suave)',
  },

  passDots: {
    fontSize: 18,
    color: 'var(--text-suave)',
    letterSpacing: 4,
  },

  cardSaldo: {
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)',
    padding: '18px 20px',
    width: '100%',
    maxWidth: 440,
    border: '1px solid rgba(239, 68, 68, 0.2)',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },

  saldoHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },

  saldoIconBox: {
    width: 44,
    height: 44,
    borderRadius: 'var(--radius-md)',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  saldoIcon: {
    fontSize: 20,
  },

  saldoTitulo: {
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--text-principal)',
  },

  saldoSubtitulo: {
    fontSize: 12,
    color: 'var(--color-error)',
    marginTop: 2,
    fontWeight: 500,
  },

  saldoResumen: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(239, 68, 68, 0.06)',
    border: '1px solid rgba(239, 68, 68, 0.15)',
    borderRadius: 'var(--radius-md)',
    padding: '14px',
  },

  saldoItem: {
    flex: 1,
    textAlign: 'center',
  },

  saldoDivider: {
    width: 1,
    height: 40,
    background: 'rgba(239, 68, 68, 0.2)',
  },

  saldoLabel: {
    fontSize: 11,
    color: 'var(--text-suave)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },

  saldoNumero: {
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--text-principal)',
  },

  saldoMonto: {
    fontSize: 22,
    fontWeight: 800,
    color: 'var(--color-error)',
    letterSpacing: '-0.02em',
  },

  saldoDetalle: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },

  saldoDetalleTitulo: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-suave)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },

  saldoLugar: {
    background: 'var(--bg-hover)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 14px',
    border: '1px solid var(--border-suave)',
  },

  saldoLugarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  saldoLugarNombre: {
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--text-principal)',
  },

  saldoLugarMonto: {
    fontSize: 15,
    fontWeight: 800,
    color: 'var(--color-error)',
  },

  saldoLugarFaltas: {
    fontSize: 11,
    color: 'var(--text-suave)',
    marginTop: 4,
  },

  saldoLugarTelefono: {
    fontSize: 12,
    color: 'var(--color-primario)',
    marginTop: 6,
    fontWeight: 600,
    display: 'block',
    textDecoration: 'none',
  },

  saldoNota: {
    fontSize: 11,
    color: 'var(--text-suave)',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  navbar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'var(--bg-card)',
    display: 'flex',
    justifyContent: 'space-around',
    padding: '10px 12px',
    borderTop: '1px solid var(--border-suave)',
    boxShadow: '0 -2px 12px rgba(0, 0, 0, 0.04)',
    gap: 6,
  },

  navBtn: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: '10px 8px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    transition: 'all 0.2s ease',
    minHeight: 60,
  },

  navIcon: {
    fontSize: 20,
  },

  navLabel: {
    fontSize: 11,
    fontWeight: 600,
  },
};