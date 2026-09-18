import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../services/api';
import { useTheme } from '../context/ThemeContext';
import ConfirmarSalida from '../components/ConfirmarSalida';


export default function MisReservas() {
  const navigate = useNavigate();
  const location = useLocation();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const [reservas, setReservas] = useState([]);
  const [inscripciones, setInscripciones] = useState([]);
  const [tab, setTab] = useState('reservas');
  const [toast, setToast] = useState(null);
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);
  const [mostrarNotif, setMostrarNotif] = useState(false);
  const [mostrarMasFuturas, setMostrarMasFuturas] = useState(false);
  const [mostrarMasPasadas, setMostrarMasPasadas] = useState(false);
  const [reservaConfirmar, setReservaConfirmar] = useState(null);
  const [inscripcionConfirmar, setInscripcionConfirmar] = useState(null);
  const { tema, cambiarTema } = useTheme();

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = () => {
    API.get(`/reservas/usuario/${usuario.id}`)
      .then(res => setReservas(res.data))
      .catch(() => {});

    API.get(`/inscripciones/usuario/${usuario.id}`)
      .then(res => setInscripciones(res.data))
      .catch(() => {});

    API.get(`/notificaciones/${usuario.id}`)
      .then(res => setNotificaciones(res.data))
      .catch(() => {});
  };

  const mostrarToast = (msg, tipo = 'exito') => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 4000);
  };

  const noLeidas = notificaciones.filter(n => !n.leida).length;

  const marcarTodasLeidas = async () => {
    try {
      await API.put(`/notificaciones/leer/todas/${usuario.id}`);
      setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
    } catch (err) {}
  };

  const ejecutarCancelacionReserva = async (reserva) => {
    try {
      await API.delete(`/reservas/${reserva.id}`);
      setReservas(prev => prev.filter(r => r.id !== reserva.id));
      mostrarToast('Reserva cancelada correctamente');
    } catch (err) {
      mostrarToast(err.response?.data?.error || 'Error al cancelar', 'error');
    }
  };

  const cancelarReserva = (reserva) => {
    setReservaConfirmar(reserva);
  };

  const obtenerFechaHoraReserva = (reserva) => {
    const [year, month, day] = String(reserva.fecha).slice(0, 10).split('-').map(Number);
    const [hora, minuto] = String(reserva.hora_inicio || '00:00')
      .slice(0, 5)
      .split(':')
      .map(Number);

    return new Date(year, month - 1, day, hora, minuto, 0);
  };

  const esHoy = (reserva) => {
    const fecha = obtenerFechaHoraReserva(reserva);
    const ahora = new Date();

    return (
      fecha.getFullYear() === ahora.getFullYear() &&
      fecha.getMonth() === ahora.getMonth() &&
      fecha.getDate() === ahora.getDate()
    );
  };

  const estaPasada = (reserva) => {
    return obtenerFechaHoraReserva(reserva) < new Date();
  };

  const puedeCancelar = (reserva) => {
    const diff = (obtenerFechaHoraReserva(reserva) - new Date()) / (1000 * 60 * 60);
    return diff >= 2;
  };

  const formatearFecha = (fechaStr) => {
    const [year, month, day] = String(fechaStr).slice(0, 10).split('-').map(Number);
    const fecha = new Date(year, month - 1, day);

    return fecha.toLocaleDateString('es-EC', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  const ejecutarCancelacionInscripcion = async (i) => {
    try {
      await API.delete(`/inscripciones/salir/${usuario.id}/${i.lugar_id}`);

      setInscripciones(prev => prev.filter(x => x.id !== i.id));
      mostrarToast('Te has desinscrito del lugar');
    } catch (err) {
      if (err.response?.status === 409) {
        const { saldo_pendiente, reservas_futuras } = err.response.data;

        setInscripcionConfirmar({
          ...i,
          bloqueo: {
            saldo: Number(saldo_pendiente || 0),
            reservas: Number(reservas_futuras || 0)
          }
        });

        return;
      }

      mostrarToast(
        err.response?.data?.error || 'Error al desinscribirse',
        'error'
      );
    }
  };

  const cancelarInscripcion = (i) => {
    setInscripcionConfirmar(i);
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
      <ConfirmarSalida
        abierto={!!reservaConfirmar}
        onCancelar={() => setReservaConfirmar(null)}
        onConfirmar={() => {
          ejecutarCancelacionReserva(reservaConfirmar);
          setReservaConfirmar(null);
        }}
        titulo="Cancelar reserva"
        texto="¿Estás seguro de que deseas cancelar esta reserva?"
        textoConfirmar="Sí, cancelar"
      />

      {inscripcionConfirmar && !inscripcionConfirmar.bloqueo && (
        <ConfirmarSalida
          abierto={true}
          onCancelar={() => setInscripcionConfirmar(null)}
          onConfirmar={() => ejecutarCancelacionInscripcion(inscripcionConfirmar)}
          titulo="Desinscribirme del lugar"
          texto="¿Estás seguro de que deseas desinscribirte de este lugar? Tendrás que volver a solicitar la inscripción para reservar nuevamente."
          textoConfirmar="Sí, desinscribirme"
        />
      )}

      {inscripcionConfirmar?.bloqueo && (
        <ConfirmarSalida
          abierto={true}
          soloAviso={true}
          onCancelar={() => setInscripcionConfirmar(null)}
          onConfirmar={() => setInscripcionConfirmar(null)}
          titulo="No puedes desinscribirte todavía"
          texto={
            inscripcionConfirmar.bloqueo.saldo > 0 &&
            inscripcionConfirmar.bloqueo.reservas > 0
              ? `Tienes un saldo pendiente de $${inscripcionConfirmar.bloqueo.saldo.toFixed(2)} y ${inscripcionConfirmar.bloqueo.reservas} reservas futuras en este lugar. Debes resolver estos pendientes antes de desinscribirte.`
              : inscripcionConfirmar.bloqueo.saldo > 0
                ? `Tienes un saldo pendiente de $${inscripcionConfirmar.bloqueo.saldo.toFixed(2)} en este lugar. Debes cancelar la deuda antes de desinscribirte.`
                : `Tienes ${inscripcionConfirmar.bloqueo.reservas} reservas futuras en este lugar. Debes cancelarlas antes de desinscribirte.`
          }
          textoConfirmar="Entendido"
        />
      )}
      {/* Toast */}
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

      {/* ZONA SUPERIOR FIJA */}
      <div style={styles.topBar}>

        {/* HEADER */}
        <div style={styles.header}>
          <div>
            <p style={styles.headerSubtitulo}>Mis actividades</p>
            <h2 style={styles.headerTitulo}>Reservas y lugares</h2>
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
                <span style={styles.badge}>
                  {noLeidas}
                </span>
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

        {/* NOTIFICACIONES */}
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
                    {!n.leida && (
                      <div style={styles.notifPunto}></div>
                    )}

                    <div style={{ flex: 1 }}>
                      <p style={styles.notifMensaje}>
                        {n.mensaje}
                      </p>

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

        {/* TABS */}
        <div style={styles.tabs}>
          <button
            style={{
              ...styles.tab,
              ...(tab === 'reservas' ? styles.tabActivo : {})
            }}
            onClick={() => setTab('reservas')}
          >
            <span style={styles.tabIcon}>📅</span>
            <span>Mis Reservas</span>

            {reservas.length > 0 && (
              <span style={styles.tabBadge}>
                {reservas.length}
              </span>
            )}
          </button>

          <button
            style={{
              ...styles.tab,
              ...(tab === 'inscripciones' ? styles.tabActivo : {})
            }}
            onClick={() => setTab('inscripciones')}
          >
            <span style={styles.tabIcon}>🏠</span>
            <span>Mis Lugares</span>

            {inscripciones.length > 0 && (
              <span style={styles.tabBadge}>
                {inscripciones.length}
              </span>
            )}
          </button>
        </div>

      </div>

      <div style={styles.content}>
        {tab === 'reservas' && (
          reservas.length === 0 ? (
            <div style={styles.vacio}>
              <div style={styles.vacioIcon}>📅</div>
              <p style={styles.vacioTitulo}>No tienes reservas aún</p>
              <p style={styles.vacioTexto}>
                Explora los lugares disponibles y haz tu primera reserva
              </p>
              <button style={styles.btnExplorar} onClick={() => navigate('/home')}>
                Explorar lugares
              </button>
            </div>
          ) : (
            <div style={styles.reservasSecciones}>
              {(() => {
                const futuras = reservas
                  .filter(r => !estaPasada(r))
                  .sort((a, b) => obtenerFechaHoraReserva(a) - obtenerFechaHoraReserva(b));

                const pasadas = reservas
                  .filter(r => estaPasada(r))
                  .sort((a, b) => obtenerFechaHoraReserva(b) - obtenerFechaHoraReserva(a));

                const futurasVisibles = mostrarMasFuturas ? futuras : futuras.slice(0, 10);
                const pasadasVisibles = mostrarMasPasadas ? pasadas : pasadas.slice(0, 10);

                return (
                  <>
                    {/* RESERVAS FUTURAS */}
                    <section>
                      <div style={styles.seccionReservaHeader}>
                        <div>
                          <h3 style={styles.seccionReservaTitulo}>📅 Reservas futuras</h3>
                          <p style={styles.seccionReservaSub}>
                            {futuras.length} {futuras.length === 1 ? 'reserva' : 'reservas'}
                          </p>
                        </div>
                      </div>

                      {futuras.length === 0 ? (
                        <div style={styles.vacioSeccion}>
                          <span>📭</span>
                          <p>No tienes reservas futuras</p>
                        </div>
                      ) : (
                        <>
                          <div style={styles.lista}>
                            {futurasVisibles.map(r => {
                              const cancelable = puedeCancelar(r);
                              const hoy = esHoy(r);

                              return (
                                <div
                                  key={r.id}
                                  style={{
                                    ...styles.card,
                                    borderLeft: hoy
                                      ? '4px solid var(--color-primario)'
                                      : '4px solid transparent',
                                    background: hoy
                                      ? 'var(--color-primario-suave)'
                                      : 'var(--bg-card)',
                                  }}
                                >
                                  <div style={styles.cardHeader}>
                                    <div style={styles.cardIcono}>📅</div>

                                    <div style={{ flex: 1 }}>
                                      <h4 style={styles.cardTitulo}>{r.lugar_nombre}</h4>

                                      <p style={styles.cardFecha}>
                                        {formatearFecha(r.fecha)}
                                        {hoy && ' · Hoy'}
                                      </p>
                                    </div>

                                    <span style={{
                                      ...styles.badge,
                                      background:
                                        r.estado === 'confirmada'
                                          ? 'rgba(16, 185, 129, 0.1)'
                                          : 'rgba(245, 158, 11, 0.1)',
                                      color:
                                        r.estado === 'confirmada'
                                          ? 'var(--color-exito)'
                                          : 'var(--color-advertencia)',
                                      borderColor:
                                        r.estado === 'confirmada'
                                          ? 'rgba(16, 185, 129, 0.2)'
                                          : 'rgba(245, 158, 11, 0.2)',
                                    }}>
                                      {r.estado}
                                    </span>
                                  </div>

                                  <div style={styles.cardHora}>
                                    <span style={styles.cardHoraIcon}>🕐</span>
                                    <span style={styles.cardHoraTexto}>
                                      {r.hora_inicio?.slice(0, 5)} - {r.hora_fin?.slice(0, 5)}
                                    </span>
                                  </div>

                                  {cancelable ? (
                                    <button
                                      style={styles.btnCancelar}
                                      onClick={() => cancelarReserva(r)}
                                    >
                                      Cancelar reserva
                                    </button>
                                  ) : (
                                    <div style={styles.aviso}>
                                      <span style={styles.avisoIcon}>⏰</span>
                                      <span>
                                        No se puede cancelar con menos de 2 horas de anticipación
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {futuras.length > 10 && (
                            <button
                              style={styles.btnMostrarMas}
                              onClick={() => setMostrarMasFuturas(!mostrarMasFuturas)}
                            >
                              {mostrarMasFuturas ? 'Mostrar menos' : 'Mostrar más'}
                            </button>
                          )}
                        </>
                      )}
                    </section>

                    {/* RESERVAS PASADAS */}
                    <section>
                      <div style={styles.seccionReservaHeader}>
                        <div>
                          <h3 style={styles.seccionReservaTitulo}>🕘 Reservas pasadas</h3>
                          <p style={styles.seccionReservaSub}>
                            {pasadas.length} {pasadas.length === 1 ? 'reserva' : 'reservas'}
                          </p>
                        </div>
                      </div>

                      {pasadas.length === 0 ? (
                        <div style={styles.vacioSeccion}>
                          <span>✅</span>
                          <p>Aún no tienes reservas pasadas</p>
                        </div>
                      ) : (
                        <>
                          <div style={styles.lista}>
                            {pasadasVisibles.map(r => (
                              <div
                                key={r.id}
                                style={{
                                  ...styles.card,
                                  borderLeft: '4px solid var(--text-suave)',
                                  opacity: 0.75,
                                }}
                              >
                                <div style={styles.cardHeader}>
                                  <div style={styles.cardIcono}>🕘</div>

                                  <div style={{ flex: 1 }}>
                                    <h4 style={styles.cardTitulo}>{r.lugar_nombre}</h4>

                                    <p style={styles.cardFecha}>
                                      {formatearFecha(r.fecha)}
                                    </p>
                                  </div>

                                  <span style={{
                                    ...styles.badge,
                                    background: 'var(--bg-hover)',
                                    color: 'var(--text-suave)',
                                    borderColor: 'var(--border-suave)',
                                  }}>
                                    Finalizada
                                  </span>
                                </div>

                                <div style={styles.cardHora}>
                                  <span style={styles.cardHoraIcon}>🕐</span>
                                  <span style={styles.cardHoraTexto}>
                                    {r.hora_inicio?.slice(0, 5)} - {r.hora_fin?.slice(0, 5)}
                                  </span>
                                </div>

                                <div style={styles.reservaPasadaAviso}>
                                  <span>✓</span>
                                  <span>Esta reserva ya finalizó</span>
                                </div>
                              </div>
                            ))}
                          </div>

                          {pasadas.length > 10 && (
                            <button
                              style={styles.btnMostrarMas}
                              onClick={() => setMostrarMasPasadas(!mostrarMasPasadas)}
                            >
                              {mostrarMasPasadas ? 'Mostrar menos' : 'Mostrar más'}
                            </button>
                          )}
                        </>
                      )}
                    </section>
                  </>
                );
              })()}
            </div>
          )
        )}

        {tab === 'inscripciones' && (
          inscripciones.length === 0 ? (
            <div style={styles.vacio}>
              <div style={styles.vacioIcon}>🏠</div>
              <p style={styles.vacioTitulo}>No estás inscrito en ningún lugar</p>
              <p style={styles.vacioTexto}>Inscríbete a un centro para poder reservar horarios</p>
              <button style={styles.btnExplorar} onClick={() => navigate('/home')}>
                Explorar lugares
              </button>
            </div>
          ) : (
            <div style={styles.lista}>
              {inscripciones.map(i => (
                <div key={i.id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <div style={styles.cardIcono}>🏠</div>
                    <div style={{ flex: 1 }}>
                      <h4 style={styles.cardTitulo}>{i.lugar_nombre}</h4>
                      {i.direccion && (
                        <p style={styles.cardFecha}>📍 {i.direccion}</p>
                      )}
                    </div>
                    <span style={{
                      ...styles.badge,
                      background:
                        i.estado === 'aprobada' ? 'rgba(16, 185, 129, 0.1)' :
                        i.estado === 'rechazada' ? 'rgba(239, 68, 68, 0.1)' :
                        'rgba(245, 158, 11, 0.1)',
                      color:
                        i.estado === 'aprobada' ? 'var(--color-exito)' :
                        i.estado === 'rechazada' ? 'var(--color-error)' :
                        'var(--color-advertencia)',
                      borderColor:
                        i.estado === 'aprobada' ? 'rgba(16, 185, 129, 0.2)' :
                        i.estado === 'rechazada' ? 'rgba(239, 68, 68, 0.2)' :
                        'rgba(245, 158, 11, 0.2)',
                    }}>
                      {i.estado}
                    </span>
                  </div>

                  {i.estado === 'aprobada' && (
                    <button style={styles.btnVerHorarios} onClick={() => navigate(`/lugar/${i.lugar_id}`)}>
                      Ver horarios →
                    </button>
                  )}
                  {i.estado !== 'pendiente' && (
                    <button style={styles.btnCancelar} onClick={() => cancelarInscripcion(i)}>
                      Cancelar inscripción
                    </button>
                  )}
                </div>
              ))}
            </div>
          )
        )}
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
  topBar: {
    position: 'sticky',
    top: 0,
    zIndex: 20,
    background: 'var(--bg-card)',
    boxShadow: 'var(--shadow-sm)',
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
  headerAcciones: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
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
  reservasSecciones: {
    display: 'flex',
    flexDirection: 'column',
    gap: 28,
  },

  seccionReservaHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  seccionReservaTitulo: {
    fontSize: 17,
    fontWeight: 700,
    color: 'var(--text-principal)',
    margin: 0,
  },

  seccionReservaSub: {
    fontSize: 12,
    color: 'var(--text-suave)',
    marginTop: 3,
  },

  vacioSeccion: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-suave)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px 16px',
    textAlign: 'center',
    color: 'var(--text-suave)',
    fontSize: 13,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },

  btnMostrarMas: {
    width: '100%',
    marginTop: 12,
    padding: '11px 16px',
    background: 'var(--bg-card)',
    color: 'var(--color-primario)',
    border: '1px solid var(--color-primario-borde)',
    borderRadius: 'var(--radius-md)',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },

  reservaPasadaAviso: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    background: 'var(--bg-hover)',
    border: '1px solid var(--border-suave)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-suave)',
    fontSize: 12,
    fontWeight: 600,
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
    borderTop: '1px solid var(--border-suave)',
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
    transition: 'all 0.2s ease',
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
  tabs: {
    display: 'flex',
    background: 'var(--bg-card)',
    padding: '8px 16px 0',
    gap: 6,
    borderBottom: '1px solid var(--border-suave)',
  },
  tab: {
    flex: 1,
    padding: '12px 14px',
    border: 'none',
    background: 'transparent',
    fontSize: 13,
    color: 'var(--text-suave)',
    fontWeight: 600,
    cursor: 'pointer',
    borderBottom: '2.5px solid transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    transition: 'all 0.2s ease',
  },
  tabActivo: {
    color: 'var(--color-primario)',
    borderBottomColor: 'var(--color-primario)',
  },
  tabIcon: {
    fontSize: 15,
  },
  tabBadge: {
    background: 'var(--color-primario)',
    color: '#fff',
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: 'var(--radius-full)',
    minWidth: 20,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: '20px 24px 100px',
  },
  lista: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  vacio: {
    textAlign: 'center',
    marginTop: '3rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    background: 'var(--bg-card)',
    padding: '40px 24px',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-suave)',
  },
  vacioIcon: {
    fontSize: 48,
    opacity: 0.5,
    marginBottom: 4,
  },
  vacioTitulo: {
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--text-principal)',
  },
  vacioTexto: {
    fontSize: 13,
    color: 'var(--text-secundario)',
    maxWidth: 280,
    lineHeight: 1.5,
  },
  btnExplorar: {
    background: 'var(--color-primario)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 28px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 8,
  },
  card: {
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)',
    padding: '16px 18px',
    border: '1px solid var(--border-suave)',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardIcono: {
    width: 40,
    height: 40,
    borderRadius: 'var(--radius-md)',
    background: 'var(--color-primario-suave)',
    border: '1px solid var(--color-primario-borde)',
    fontSize: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardTitulo: {
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--text-principal)',
    marginBottom: 2,
    letterSpacing: '-0.01em',
  },
  cardFecha: {
    fontSize: 13,
    color: 'var(--text-secundario)',
    textTransform: 'capitalize',
  },
  cardHora: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    background: 'var(--bg-hover)',
    borderRadius: 'var(--radius-sm)',
  },
  cardHoraIcon: {
    fontSize: 14,
  },
  cardHoraTexto: {
    fontSize: 14,
    color: 'var(--color-primario)',
    fontWeight: 700,
  },
  badge: {
    padding: '5px 11px',
    borderRadius: 'var(--radius-full)',
    fontSize: 11,
    fontWeight: 700,
    flexShrink: 0,
    border: '1px solid',
    textTransform: 'capitalize',
  },
  btnCancelar: {
    background: 'rgba(239, 68, 68, 0.1)',
    color: 'var(--color-error)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: 'var(--radius-sm)',
    padding: '11px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
    transition: 'all 0.2s ease',
  },
  btnVerHorarios: {
    background: 'var(--color-primario)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '11px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
  },
  aviso: {
    background: 'var(--bg-hover)',
    border: '1px solid var(--border-suave)',
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    fontSize: 12,
    color: 'var(--text-secundario)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  avisoIcon: {
    fontSize: 14,
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
  headerAcciones: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },

  btnSalir: {
    width: 42,
    height: 42,
    borderRadius: 'var(--radius-full)',
    background: 'var(--bg-hover)',
    color: 'var(--color-error)',
    border: '1px solid var(--border-suave)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
};