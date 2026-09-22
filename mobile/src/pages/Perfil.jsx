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
  const [form, setForm] = useState({
    nombre: usuario.nombre || '',
    apellido: usuario.apellido || '',
    nickname: usuario.nickname || '',
    avatar: usuario.avatar || 'avatar_01'
  });
  const avatares = [
    { id: 'avatar_01', emoji: '😎' },
    { id: 'avatar_02', emoji: '🤓' },
    { id: 'avatar_03', emoji: '😊' },
    { id: 'avatar_04', emoji: '😁' },
    { id: 'avatar_05', emoji: '🧢' },
    { id: 'avatar_06', emoji: '🎮' },
    { id: 'avatar_07', emoji: '⚡' },
    { id: 'avatar_08', emoji: '🔥' },
    { id: 'avatar_09', emoji: '🐺' },
    { id: 'avatar_10', emoji: '🦊' },
    { id: 'avatar_11', emoji: '🐼' },
    { id: 'avatar_12', emoji: '🦁' }
  ];

  const obtenerAvatar = id =>
    avatares.find(a => a.id === id)?.emoji || '👤';
  const [passForm, setPassForm] = useState({ actual: '', nueva: '', confirmar: '' });
  const [editandoPass, setEditandoPass] = useState(false);
  const [mostrarActual, setMostrarActual] = useState(false);
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [toast, setToast] = useState(null);
  const [saldo, setSaldo] = useState(null);
  const [membresias, setMembresias] = useState([]);
  const [historialPagos, setHistorialPagos] = useState([]);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);
  const [mostrarNotif, setMostrarNotif] = useState(false);
  const { tema, cambiarTema } = useTheme();

  useEffect(() => {
    API.get(`/usuarios/${usuario.id}/saldo`)
      .then(res => setSaldo(res.data))
      .catch(() => {});

    if (usuario.rol === 'cliente') {
      API.get(`/admin/membresias/usuario/${usuario.id}`)
        .then(res => setMembresias(res.data))
        .catch(() => {});
    }

    API.get('/notificaciones/me')
      .then(res => setNotificaciones(res.data))
      .catch(() => {});
  }, []);
  const formatearFechaMembresia = fecha => {
    if (!fecha) return null;

    const fechaTexto = String(fecha).slice(0, 10);
    const [year, month, day] = fechaTexto.split('-');

    return `${day}/${month}/${year}`;
  };

  const mostrarToast = (msg, tipo = 'exito') => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3000);
  };

  const guardarPerfil = async () => {
    try {
      if (usuario.rol === 'cliente' && form.nickname.trim().length < 3) {
        mostrarToast('El nickname debe tener mínimo 3 caracteres', 'error');
        return;
      }

      const res = await API.put(`/usuarios/${usuario.id}`, form);

      const actualizado = {
        ...usuario,
        ...res.data.usuario
      };

      localStorage.setItem('usuario', JSON.stringify(actualizado));

      setForm({
        nombre: actualizado.nombre || '',
        apellido: actualizado.apellido || '',
        nickname: actualizado.nickname || '',
        avatar: actualizado.avatar || 'avatar_01'
      });

      setEditando(false);
      mostrarToast('Perfil actualizado correctamente');
    } catch (err) {
      mostrarToast(
        err.response?.data?.error || 'Error al actualizar',
        'error'
      );
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
      await API.put('/notificaciones/leer/todas/me');
      setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
    } catch (err) {}
  };

  const cerrarSesion = () => {
    localStorage.clear();
    navigate('/');
  };

  const abrirHistorialPagos = async () => {
    try {
      setCargandoHistorial(true);

      const res = await API.get(
        `/asistencia/historial-pagos/${usuario.id}`
      );

      setHistorialPagos(res.data);
      setMostrarHistorial(true);
    } catch (err) {
      mostrarToast(
        err.response?.data?.error || 'Error al obtener historial de pagos',
        'error'
      );
    } finally {
      setCargandoHistorial(false);
    }
  };

  const formatearFechaHistorial = fecha => {
    if (!fecha) return 'No registrado';

    const fechaTexto = String(fecha).slice(0, 10);
    const [year, month, day] = fechaTexto.split('-');

    return `${day}/${month}/${year}`;
  };

  const formatearFechaHoraHistorial = fecha => {
    if (!fecha) return 'No registrado';

    return new Intl.DateTimeFormat('es-EC', {
      timeZone: 'America/Guayaquil',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(fecha));
  };

  const formatearFechaHoraLocal = fecha => {
    if (!fecha) return 'No registrado';

    const [fechaParte, horaParte = ''] = String(fecha).split('T');
    const [year, month, day] = fechaParte.split('-');
    const [hour = '00', minute = '00'] = horaParte.split(':');

    const horaNumero = Number(hour);
    const periodo = horaNumero >= 12 ? 'p. m.' : 'a. m.';
    const hora12 = horaNumero % 12 || 12;

    return `${day}/${month}/${year}, ${String(hora12).padStart(2, '0')}:${minute} ${periodo}`;
  };

  const formatearHoraHistorial = hora =>
    hora ? String(hora).slice(0, 5) : 'No registrada';

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
              aria-hidden="true"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
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
            <span style={{ fontSize: 46 }}>
              {obtenerAvatar(usuario.avatar || 'avatar_01')}
            </span>
          </div>

          <h3 style={styles.nombre}>
            {usuario.rol === 'cliente' && usuario.nickname
              ? `@${usuario.nickname}`
              : `${usuario.nombre} ${usuario.apellido}`}
          </h3>

          {usuario.rol === 'cliente' && usuario.nickname && (
            <p style={{
              fontSize: 13,
              color: 'var(--text-suave)',
              marginTop: 2
            }}>
              {usuario.nombre} {usuario.apellido}
            </p>
          )}
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

        {/* Membresías */}
        {usuario.rol === 'cliente' && membresias.length > 0 && (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <p style={styles.cardTitulo}>
                  🎟 Membresía
                </p>

                <p style={styles.cardSubtitulo}>
                  Tus membresías activas
                </p>
              </div>
            </div>

            <div style={{ marginTop: 8 }}>
              {membresias.map((m, index) => (
                <div
                  key={m.id}
                  style={{
                    padding: '14px 0',
                    borderBottom:
                      index < membresias.length - 1
                        ? '1px solid var(--border-suave)'
                        : 'none'
                  }}
                >
                  <p
                    style={{
                      fontWeight: 700,
                      color: 'var(--text-principal)',
                      margin: '0 0 8px'
                    }}
                  >
                    🏋️ {m.lugar_nombre}
                  </p>

                  {m.membresia_hasta && (
                    <p
                      style={{
                        color: 'var(--text-suave)',
                        margin: '4px 0',
                        fontSize: 14
                      }}
                    >
                      <strong>Vigencia:</strong>{' '}
                      Hasta el {formatearFechaMembresia(m.membresia_hasta)}
                    </p>
                  )}

                  {m.limite_reservas !== null && (
                    <p
                      style={{
                        color: 'var(--text-suave)',
                        margin: '4px 0',
                        fontSize: 14
                      }}
                    >
                      <strong>Reservas disponibles:</strong>{' '}
                      {m.reservas_disponibles} de {m.limite_reservas}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Historial de pagos */}
        {usuario.rol === 'cliente' && (
          <div style={{ marginBottom: 16 }}>
            <button
              style={{
                ...styles.btnEditar,
                width: '100%'
              }}
              onClick={abrirHistorialPagos}
              disabled={cargandoHistorial}
            >
              🧾 {cargandoHistorial ? 'Cargando...' : 'Historial de pagos'}
            </button>
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

              {/* NOMBRE */}
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nombre</label>
                <input
                  style={styles.input}
                  placeholder="Tu nombre"
                  value={form.nombre}
                  onChange={e =>
                    setForm({ ...form, nombre: e.target.value })
                  }
                />
              </div>

              {/* APELLIDO */}
              <div style={styles.inputGroup}>
                <label style={styles.label}>Apellido</label>
                <input
                  style={styles.input}
                  placeholder="Tu apellido"
                  value={form.apellido}
                  onChange={e =>
                    setForm({ ...form, apellido: e.target.value })
                  }
                />
              </div>

              {/* NICKNAME - SOLO CLIENTES */}
              {usuario.rol === 'cliente' && (
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Nickname</label>

                  <input
                    style={styles.input}
                    placeholder="Ej: Biro"
                    maxLength={30}
                    value={form.nickname}
                    onChange={e =>
                      setForm({
                        ...form,
                        nickname: e.target.value.replace(/[^a-zA-Z0-9._]/g, '')
                      })
                    }
                  />

                  <p style={styles.hint}>
                    Tu nombre público en Orbiport. Debe ser único.
                  </p>
                </div>
              )}

              {/* AVATAR - CLIENTES Y ADMINISTRADORES */}
              <div style={styles.inputGroup}>
                <label style={styles.label}>Avatar</label>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(6, 1fr)',
                    gap: 10,
                    marginTop: 8
                  }}
                >
                  {avatares.map(a => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          avatar: a.id
                        })
                      }
                      style={{
                        height: 54,
                        borderRadius: 14,
                        fontSize: 27,
                        cursor: 'pointer',
                        background:
                          form.avatar === a.id
                            ? 'var(--color-primario-suave)'
                            : 'var(--bg-card)',
                        border:
                          form.avatar === a.id
                            ? '2px solid var(--color-primario)'
                            : '1px solid var(--border-suave)'
                      }}
                    >
                      {a.emoji}
                    </button>
                  ))}
                </div>

                <p style={styles.hint}>
                  Selecciona tu avatar de Orbiport.
                </p>
              </div>

              {/* CORREO */}
              <div style={styles.infoBox}>
                <p style={styles.infoBoxLabel}>
                  Correo electrónico (no editable)
                </p>
                <p style={styles.infoBoxValor}>
                  {usuario.correo}
                </p>
              </div>

              {/* BOTONES */}
              <div style={styles.botonesRow}>
                <button
                  style={styles.btnGuardar}
                  onClick={guardarPerfil}
                >
                  Guardar cambios
                </button>

                <button
                  style={styles.btnCancelar}
                  onClick={() => {
                    setEditando(false);

                    setForm({
                      nombre: usuario.nombre || '',
                      apellido: usuario.apellido || '',
                      nickname: usuario.nickname || '',
                      avatar: usuario.avatar || 'avatar_01'
                    });
                  }}
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
              {usuario.rol === 'cliente' && (
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Nickname</span>
                  <span style={styles.infoValor}>
                    {usuario.nickname
                      ? `@${usuario.nickname}`
                      : 'Sin configurar'}
                  </span>
                </div>
              )}

              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Avatar</span>
                <span style={{ fontSize: 26 }}>
                  {obtenerAvatar(usuario.avatar || 'avatar_01')}
                </span>
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
      
      {/* MODAL HISTORIAL DE PAGOS */}
      {mostrarHistorial && (
        <div style={styles.historialOverlay}>
          <div style={styles.historialModal}>
            <div style={styles.historialHeader}>
              <div>
                <p style={styles.historialTitulo}>Historial de pagos</p>
                <p style={styles.historialSubtitulo}>
                  Consulta tus cargos y pagos registrados
                </p>
              </div>

              <button
                style={styles.historialCerrar}
                onClick={() => setMostrarHistorial(false)}
              >
                ✕
              </button>
            </div>

            <div style={styles.historialContenido}>
              {historialPagos.length === 0 ? (
                <div style={styles.historialVacio}>
                  <div style={{ fontSize: 36 }}>🧾</div>

                  <p style={styles.historialVacioTitulo}>
                    Sin movimientos
                  </p>

                  <p style={styles.historialVacioTexto}>
                    Todavía no tienes cargos ni pagos registrados.
                  </p>
                </div>
              ) : (
                historialPagos.map(m => {
                  const monto = Number(m.monto || 0);
                  const pagado = Number(m.pagado || 0);
                  const saldoRestante = Number(m.saldo_restante || 0);

                  return (
                    <div key={m.id} style={styles.historialItem}>
                      <div style={styles.historialItemHeader}>
                        <div>
                          <p style={styles.historialLugar}>
                            {m.lugar_nombre}
                          </p>

                          <p style={styles.historialReserva}>
                            Reserva: {formatearFechaHistorial(m.fecha_reserva)}
                            {' · '}
                            {formatearHoraHistorial(m.hora_inicio)}
                          </p>
                        </div>

                        <span
                          style={{
                            ...styles.historialEstado,
                            background:
                              m.estado === 'pagado'
                                ? 'rgba(16, 185, 129, 0.1)'
                                : 'rgba(245, 158, 11, 0.1)',
                            color:
                              m.estado === 'pagado'
                                ? 'var(--color-exito)'
                                : 'var(--color-advertencia)',
                            borderColor:
                              m.estado === 'pagado'
                                ? 'rgba(16, 185, 129, 0.2)'
                                : 'rgba(245, 158, 11, 0.2)'
                          }}
                        >
                          {m.estado === 'pagado' ? 'Pagado' : 'Pendiente'}
                        </span>
                      </div>

                      <div style={styles.historialMontos}>
                        <div style={styles.historialMontoItem}>
                          <span style={styles.historialMontoLabel}>
                            Monto
                          </span>

                          <strong style={styles.historialMontoValor}>
                            ${monto.toFixed(2)}
                          </strong>
                        </div>

                        <div style={styles.historialMontoItem}>
                          <span style={styles.historialMontoLabel}>
                            Pagado
                          </span>

                          <strong style={styles.historialMontoValor}>
                            ${pagado.toFixed(2)}
                          </strong>
                        </div>

                        <div style={styles.historialMontoItem}>
                          <span style={styles.historialMontoLabel}>
                            Saldo
                          </span>

                          <strong
                            style={{
                              ...styles.historialMontoValor,
                              color:
                                saldoRestante > 0
                                  ? 'var(--color-error)'
                                  : 'var(--color-exito)'
                            }}
                          >
                            ${saldoRestante.toFixed(2)}
                          </strong>
                        </div>
                      </div>

                      <div style={styles.historialFechas}>
                        <p style={styles.historialFechaTexto}>
                          <strong>Cargo generado:</strong>{' '}
                          {formatearFechaHoraLocal(
                            m.fecha_creacion_penalizacion
                          )}
                        </p>

                        <p style={styles.historialFechaTexto}>
                          <strong>Pago registrado:</strong>{' '}
                          {m.estado !== 'pagado' && !m.fecha_ultimo_pago
                            ? 'Pendiente'
                            : m.fecha_ultimo_pago
                              ? formatearFechaHoraHistorial(
                                  m.fecha_ultimo_pago
                                )
                              : 'No registrado'}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <button
              style={styles.historialBtnCerrar}
              onClick={() => setMostrarHistorial(false)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* NAVBAR */}
      <div style={styles.navbar}>
        <button
          style={{
            ...styles.navBtn,
            color: location.pathname === '/home'
              ? 'var(--color-primario)'
              : 'var(--text-suave)',
            background: location.pathname === '/home'
              ? 'var(--color-primario-suave)'
              : 'transparent',
          }}
          onClick={() => navigate('/home')}
        >
          <span style={styles.navIcon}>🏠</span>
          <span style={styles.navLabel}>Inicio</span>
        </button>

        <button
          style={{
            ...styles.navBtn,
            color: location.pathname === '/mis-reservas'
              ? 'var(--color-primario)'
              : 'var(--text-suave)',
            background: location.pathname === '/mis-reservas'
              ? 'var(--color-primario-suave)'
              : 'transparent',
          }}
          onClick={() => navigate('/mis-reservas')}
        >
          <span style={styles.navIcon}>📅</span>
          <span style={styles.navLabel}>Mis Reservas</span>
        </button>

        <button
          style={{
            ...styles.navBtn,
            color: location.pathname === '/mi-progreso'
              ? 'var(--color-primario)'
              : 'var(--text-suave)',
            background: location.pathname === '/mi-progreso'
              ? 'var(--color-primario-suave)'
              : 'transparent',
          }}
          onClick={() => navigate('/mi-progreso')}
        >
          <span style={styles.navIcon}>📈</span>
          <span style={styles.navLabel}>Mi Progreso</span>
        </button>

        <button
          style={{
            ...styles.navBtn,
            color: location.pathname === '/perfil'
              ? 'var(--color-primario)'
              : 'var(--text-suave)',
            background: location.pathname === '/perfil'
              ? 'var(--color-primario-suave)'
              : 'transparent',
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

  btnSalir: {
    width: 42,
    height: 42,
    background: 'rgba(239, 68, 68, 0.1)',
    color: 'var(--color-error)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: 'var(--radius-full)',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 'min(520px, calc(100vw - 32px))',
    maxHeight: '70vh',
    overflowY: 'auto',
    padding: 20,
    borderRadius: 20,
    background: 'var(--bg-card)',
    border: '1px solid var(--border-suave)',
    boxShadow: '0 18px 50px rgba(0,0,0,0.22)',
    zIndex: 1200
  },

  notifHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },

  notifTitulo: {
    margin: 0,
    color: 'var(--text-principal)',
    fontSize: 22,
    fontWeight: 700
  },

  notifCerrar: {
    width: 40,
    height: 40,
    border: 'none',
    borderRadius: '50%',
    background: 'var(--bg-suave)',
    color: 'var(--text-suave)',
    cursor: 'pointer',
    fontSize: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  notifVacio: {
    textAlign: 'center',
    color: 'var(--text-suave)',
    padding: 28
  },

  notifLista: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10
  },

  notifItem: {
    display: 'flex',
    gap: 10,
    padding: 14,
    border: '1px solid var(--border-suave)',
    borderRadius: 14
  },

  notifPunto: {
    width: 8,
    height: 8,
    marginTop: 7,
    borderRadius: '50%',
    background: 'var(--color-primario)',
    flexShrink: 0
  },

  notifMensaje: {
    margin: 0,
    color: 'var(--text-principal)',
    fontSize: 14,
    lineHeight: 1.45
  },

  notifFecha: {
    margin: '6px 0 0',
    color: 'var(--text-suave)',
    fontSize: 12
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

  historialOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 1000,
  },

  historialModal: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '85vh',
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-suave)',
    boxShadow: 'var(--shadow-lg)',
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },

  historialHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },

  historialTitulo: {
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--text-principal)',
  },

  historialSubtitulo: {
    fontSize: 12,
    color: 'var(--text-suave)',
    marginTop: 3,
  },

  historialCerrar: {
    width: 32,
    height: 32,
    borderRadius: 'var(--radius-full)',
    border: '1px solid var(--border-suave)',
    background: 'var(--bg-hover)',
    color: 'var(--text-secundario)',
    cursor: 'pointer',
    flexShrink: 0,
  },

  historialContenido: {
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    paddingRight: 2,
  },

  historialVacio: {
    textAlign: 'center',
    padding: '32px 12px',
  },

  historialVacioTitulo: {
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--text-principal)',
    marginTop: 10,
  },

  historialVacioTexto: {
    fontSize: 12,
    color: 'var(--text-suave)',
    marginTop: 4,
  },

  historialItem: {
    border: '1px solid var(--border-suave)',
    borderRadius: 'var(--radius-md)',
    padding: 14,
    background: 'var(--bg-hover)',
  },

  historialItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },

  historialLugar: {
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--text-principal)',
  },

  historialReserva: {
    fontSize: 11,
    color: 'var(--text-suave)',
    marginTop: 3,
  },

  historialEstado: {
    fontSize: 11,
    fontWeight: 700,
    padding: '5px 9px',
    borderRadius: 'var(--radius-full)',
    border: '1px solid',
    flexShrink: 0,
  },

  historialMontos: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
    marginTop: 12,
  },

  historialMontoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    padding: '9px 8px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-suave)',
    borderRadius: 'var(--radius-sm)',
    textAlign: 'center',
  },

  historialMontoLabel: {
    fontSize: 10,
    color: 'var(--text-suave)',
    textTransform: 'uppercase',
    fontWeight: 600,
  },

  historialMontoValor: {
    fontSize: 14,
    color: 'var(--text-principal)',
  },

  historialFechas: {
    marginTop: 12,
    paddingTop: 10,
    borderTop: '1px solid var(--border-suave)',
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  },

  historialFechaTexto: {
    fontSize: 11,
    color: 'var(--text-secundario)',
  },

  historialBtnCerrar: {
    width: '100%',
    padding: '11px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-suave)',
    background: 'var(--bg-hover)',
    color: 'var(--text-principal)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
};