import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useTheme } from '../context/ThemeContext';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DIAS_JS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const obtenerProximaFecha = (dia) => {
  const hoy = new Date();
  const diaActual = hoy.getDay();
  const diaObjetivo = DIAS_JS.indexOf(dia);
  let diff = diaObjetivo - diaActual;
  if (diff < 0) diff += 7;
  const fecha = new Date(hoy);
  fecha.setDate(hoy.getDate() + diff);
  return fecha;
};

const formatearFecha = (fecha) => {
  return fecha.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' });
};

const formatHora = (hora) => {
  if (!hora) return '';
  const [h, m] = hora.slice(0, 5).split(':');
  const hNum = parseInt(h);
  const ampm = hNum >= 12 ? 'PM' : 'AM';
  const h12 = hNum % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};

export default function DetalleLugar() {
  const { id } = useParams();
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const [lugar, setLugar] = useState(null);
  const [horarios, setHorarios] = useState([]);
  const [excepciones, setExcepciones] = useState([]);
  const [toast, setToast] = useState(null);
  const [estadoInscripcion, setEstadoInscripcion] = useState(null);
  const [reservasHechas, setReservasHechas] = useState([]);
  const [modalPersonas, setModalPersonas] = useState(null);
  const [personas, setPersonas] = useState([]);
  const [fotos, setFotos] = useState([]);
  const [fotoIndex, setFotoIndex] = useState(0);
  const [fotoAmpliada, setFotoAmpliada] = useState(null);
  const { tema, cambiarTema } = useTheme();

  useEffect(() => {
    API.get(`/lugares/${id}`).then(res => setLugar(res.data)).catch(() => {});
    API.get(`/admin/horarios/${id}`).then(res => setHorarios(res.data)).catch(() => {});
    API.get(`/lugares/excepciones/lugar/${id}`).then(res => setExcepciones(res.data)).catch(() => {});
    API.get(`/fotos/${id}`).then(res => setFotos(res.data)).catch(() => {});
    API.get(`/inscripciones/usuario/${usuario.id}`).then(res => {
      const inscripcion = res.data.find(i => String(i.lugar_id) === String(id));
      if (inscripcion) setEstadoInscripcion(inscripcion.estado);
    }).catch(() => {});
    API.get(`/reservas/usuario/${usuario.id}`).then(res => setReservasHechas(res.data)).catch(() => {});
  }, [id]);

  const mostrarToast = (msg, tipo = 'exito') => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 5000);
  };

  const horarioYaPaso = (horario, fecha) => {
    const ahora = new Date();
    const [h, m] = horario.hora_inicio.split(':');
    const horaInicio = new Date(fecha);
    horaInicio.setHours(parseInt(h), parseInt(m), 0, 0);
    return horaInicio < ahora;
  };

  const formatearFechaLocal = (fecha) => {
    const yy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  };

  const getReserva = (horario, fecha) => {
    const fechaStr = formatearFechaLocal(fecha);
    if (horario.esExcepcion) {
      return reservasHechas.find(r => String(r.excepcion_id) === String(horario.id) && r.fecha?.slice(0,10) === fechaStr);
    }
    return reservasHechas.find(r => String(r.horario_id) === String(horario.id) && r.fecha?.slice(0,10) === fechaStr);
  };

  const verPersonas = async (horario, fecha) => {
    try {
      const fechaStr = formatearFechaLocal(fecha);
      const res = await API.get(`/asistencia/personas/${horario.id}/${fechaStr}`);
      setPersonas(res.data);
      setModalPersonas({ horario, fecha });
    } catch (err) {
      mostrarToast('Error al cargar personas', 'error');
    }
  };

  const reservar = async (horario, fecha) => {
    try {
      const fechaStr = formatearFechaLocal(fecha);
      const ahora = new Date();
      const [h, m] = horario.hora_inicio.split(':');
      const horaInicio = new Date(fecha);
      horaInicio.setHours(parseInt(h), parseInt(m), 0, 0);
      const diff = (horaInicio - ahora) / (1000 * 60 * 60);
      if (diff < 2) {
        mostrarToast('Solo puedes reservar con al menos 2 horas de anticipación', 'error');
        return;
      }
      const payload = horario.esExcepcion
        ? { usuario_id: usuario.id, excepcion_id: horario.id, fecha: fechaStr }
        : { usuario_id: usuario.id, horario_id: horario.id, fecha: fechaStr };
      const res = await API.post('/reservas', payload);
      setHorarios(prev => prev.map(h2 => h2.id === horario.id ? { ...h2, reservados: (h2.reservados || 0) + 1 } : h2));
      setExcepciones(prev => prev.map(e => e.id === horario.id ? { ...e, reservados: (e.reservados || 0) + 1 } : e));
      setReservasHechas(prev => [...prev, {
        ...res.data,
        horario_id: horario.esExcepcion ? null : horario.id,
        excepcion_id: horario.esExcepcion ? horario.id : null,
        fecha: fechaStr,
        hora_inicio: horario.hora_inicio,
        hora_fin: horario.hora_fin,
        dia: horario.dia
      }]);
      mostrarToast(`¡Reserva confirmada! ${formatearFecha(fecha)} ${formatHora(horario.hora_inicio)}`, 'exito');
    } catch (err) {
      mostrarToast(err.response?.data?.error || 'Error al reservar', 'error');
    }
  };

  const cancelarReserva = async (reserva) => {
    try {
      await API.delete(`/reservas/${reserva.id}`);
      setReservasHechas(prev => prev.filter(r => r.id !== reserva.id));
      if (reserva.excepcion_id) {
        setExcepciones(prev => prev.map(e => e.id === reserva.excepcion_id ? { ...e, reservados: Math.max(0, (e.reservados || 0) - 1) } : e));
      } else {
        setHorarios(prev => prev.map(h => h.id === reserva.horario_id ? { ...h, reservados: Math.max(0, (h.reservados || 0) - 1) } : h));
      }
      mostrarToast('Reserva cancelada correctamente', 'exito');
    } catch (err) {
      mostrarToast(err.response?.data?.error || 'Error al cancelar', 'error');
    }
  };

  const inscribirse = async () => {
    try {
      await API.post('/inscripciones', { usuario_id: usuario.id, lugar_id: id });
      setEstadoInscripcion('pendiente');
      mostrarToast('Solicitud enviada, espera la aprobación del administrador.', 'exito');
    } catch (err) {
      mostrarToast(err.response?.data?.error || 'Error al inscribirse', 'error');
    }
  };

  const abrirMaps = () => {
    if (lugar.maps_url) {
      window.open(lugar.maps_url, '_blank');
    } else if (lugar.direccion) {
      const query = encodeURIComponent(lugar.direccion);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    }
  };

  const abrirWhatsApp = () => {
    if (!lugar.telefono) return;
    let numero = lugar.telefono.replace(/\D/g, '');
    if (numero.startsWith('0')) numero = '593' + numero.substring(1);
    if (!numero.startsWith('593')) numero = '593' + numero;
    window.open(`https://wa.me/${numero}`, '_blank');
  };

  const horariosPorDia = (dia) => horarios.filter(h => h.dia === dia && h.activo);

  const excepcionesDelDia = (dia) => {
    const fecha = obtenerProximaFecha(dia);
    const fechaStr = formatearFechaLocal(fecha);
    return excepciones.filter(e => String(e.fecha).slice(0, 10) === fechaStr);
  };

  const renderBotonInscripcion = () => {
    if (estadoInscripcion === 'aprobada') {
      return (
        <div style={styles.inscritoBadge}>
          <span style={styles.badgeIcon}>✓</span>
          <span>Ya estás inscrito en este lugar</span>
        </div>
      );
    }
    if (estadoInscripcion === 'pendiente') {
      return (
        <div style={styles.pendienteBadge}>
          <span style={styles.badgeIcon}>⏳</span>
          <span>Solicitud pendiente de aprobación</span>
        </div>
      );
    }
    if (estadoInscripcion === 'rechazada') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={styles.rechazadoBadge}>
            <span style={styles.badgeIcon}>✕</span>
            <span>Tu solicitud fue rechazada</span>
          </div>
          <button style={styles.btnInscribirse} onClick={inscribirse}>
            Volver a solicitar
          </button>
        </div>
      );
    }
    return (
      <button style={styles.btnInscribirse} onClick={inscribirse}>
        Inscribirse a este lugar
      </button>
    );
  };

  const optimizarFoto = (url) => {
    if (!url || !url.includes('cloudinary.com')) return url;
    return url.replace('/upload/', '/upload/w_1600,q_auto:best,f_auto/');
  };

  const fotosCarrusel = fotos.length > 0 ? fotos.map(f => optimizarFoto(f.url)) : [optimizarFoto(lugar?.foto_url) || 'https://via.placeholder.com/600x400/4f46e5/ffffff?text=Orbiport'];

  if (!lugar) return (
    <div style={styles.loading}>
      <div style={styles.loadingSpinner}></div>
      <p>Cargando...</p>
    </div>
  );

  return (
    <div style={styles.container}>
      {/* TOAST */}
      {toast && (
        <div style={{
          ...styles.toast,
          background: toast.tipo === 'error' ? 'var(--color-error)' : 'var(--color-exito)'
        }}>
          <span style={styles.toastIcon}>
            {toast.tipo === 'error' ? '⚠' : '✓'}
          </span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* LIGHTBOX FOTO AMPLIADA */}
      {fotoAmpliada !== null && (
        <div style={styles.lightboxOverlay} onClick={() => setFotoAmpliada(null)}>
          <button style={styles.lightboxCerrar} onClick={() => setFotoAmpliada(null)}>✕</button>
          {fotoAmpliada > 0 && (
            <button style={{ ...styles.lightboxNav, left: 12 }} onClick={(e) => { e.stopPropagation(); setFotoAmpliada(fotoAmpliada - 1); }}>‹</button>
          )}
          {fotoAmpliada < fotosCarrusel.length - 1 && (
            <button style={{ ...styles.lightboxNav, right: 12 }} onClick={(e) => { e.stopPropagation(); setFotoAmpliada(fotoAmpliada + 1); }}>›</button>
          )}
          <img src={fotosCarrusel[fotoAmpliada]} alt="ampliada" style={styles.lightboxImg} onClick={e => e.stopPropagation()} />
          <p style={styles.lightboxContador}>{fotoAmpliada + 1} / {fotosCarrusel.length}</p>
        </div>
      )}

      {/* MODAL PERSONAS */}
      {modalPersonas && (() => {
        const paso = horarioYaPaso(modalPersonas.horario, modalPersonas.fecha);
        const reserva = getReserva(modalPersonas.horario, modalPersonas.fecha);
        const puedeReservar = estadoInscripcion === 'aprobada' && !paso && !reserva;
        return (
          <div style={styles.modalOverlay} onClick={() => setModalPersonas(null)}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <div>
                  <p style={styles.modalTitulo}>
                    {lugar.categoria === 'canchas' ? 'Canchas reservadas' : 'Personas reservadas'}
                  </p>
                  <p style={styles.modalSub}>{formatearFecha(modalPersonas.fecha)}</p>
                  <p style={styles.modalSubHora}>
                    🕐 {formatHora(modalPersonas.horario.hora_inicio)} - {formatHora(modalPersonas.horario.hora_fin)}
                  </p>
                </div>
                <button style={styles.btnCerrarX} onClick={() => setModalPersonas(null)}>✕</button>
              </div>

              <div style={styles.modalContador}>
                <span style={styles.modalContadorNum}>{personas.length}</span>
                <span style={styles.modalContadorTexto}>
                  de {modalPersonas.horario.cupos} {lugar.categoria === 'canchas' ? 'canchas reservadas' : 'cupos reservados'}
                </span>
              </div>

              {personas.length === 0 ? (
                <div style={styles.modalVacio}>
                  <p style={{ fontSize: 32 }}>👥</p>
                  <p style={styles.modalVacioTexto}>
                    {lugar.categoria === 'canchas' ? 'Aún no hay canchas reservadas' : 'Aún no hay personas reservadas'}
                  </p>
                </div>
              ) : (
                <div style={styles.modalLista}>
                  {personas.map((p, i) => (
                    <div key={i} style={styles.modalPersona}>
                      <div style={styles.modalAvatar}>
                        {p.nombre?.charAt(0).toUpperCase()}
                      </div>
                      <span style={styles.modalNombre}>{p.nombre} {p.apellido}</span>
                    </div>
                  ))}
                </div>
              )}

              {puedeReservar && (
                <button style={styles.btnReservarModal} onClick={() => { reservar(modalPersonas.horario, modalPersonas.fecha); setModalPersonas(null); }}>
                  Reservar este horario
                </button>
              )}
              {reserva && !paso && (
                <button style={styles.btnCancelarModal} onClick={() => { cancelarReserva(reserva); setModalPersonas(null); }}>
                  Cancelar mi reserva
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* HEADER */}
      <div style={styles.header}>
        <button style={styles.btnVolver} onClick={() => navigate('/home')}>
          <span style={styles.btnVolverIcon}>←</span>
        </button>
        <h2 style={styles.headerTitulo}>{lugar.nombre}</h2>
        <button onClick={cambiarTema} style={styles.iconBtn} aria-label="Cambiar tema">
          {tema === 'light' ? '🌙' : '☀️'}
        </button>
      </div>

      {/* CARRUSEL DE FOTOS */}
      <div style={styles.carruselContainer}>
        <img
          src={fotosCarrusel[fotoIndex]}
          alt={lugar.nombre}
          style={styles.carruselImg}
          onClick={() => setFotoAmpliada(fotoIndex)}
        />
        {fotosCarrusel.length > 1 && (
          <>
            <button style={{ ...styles.carruselBtn, left: 12 }} onClick={() => setFotoIndex(fotoIndex === 0 ? fotosCarrusel.length - 1 : fotoIndex - 1)}>‹</button>
            <button style={{ ...styles.carruselBtn, right: 12 }} onClick={() => setFotoIndex(fotoIndex === fotosCarrusel.length - 1 ? 0 : fotoIndex + 1)}>›</button>
            <div style={styles.carruselIndicadores}>
              {fotosCarrusel.map((_, i) => (
                <span
                  key={i}
                  style={{
                    ...styles.indicador,
                    background: i === fotoIndex ? '#fff' : 'rgba(255,255,255,0.5)',
                    width: i === fotoIndex ? 24 : 8,
                  }}
                  onClick={() => setFotoIndex(i)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* MINIATURAS */}
      {fotosCarrusel.length > 1 && (
        <div style={styles.miniaturasContainer}>
          {fotosCarrusel.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`mini ${i}`}
              style={{
                ...styles.miniatura,
                border: i === fotoIndex ? '2px solid var(--color-primario)' : '2px solid transparent',
                opacity: i === fotoIndex ? 1 : 0.6,
              }}
              onClick={() => setFotoIndex(i)}
            />
          ))}
        </div>
      )}

      <div style={styles.content}>
        {/* INFO LUGAR */}
        <div style={styles.infoLugar}>
          <h3 style={styles.titulo}>{lugar.nombre}</h3>
          {lugar.categoria && lugar.categoria !== 'general' && (
            <span style={styles.categoriaBadge}>{lugar.categoria}</span>
          )}
        </div>
        {lugar.descripcion && (
          <p style={styles.desc}>{lugar.descripcion}</p>
        )}

        {/* CONTACTO */}
        <div style={styles.contactSection}>
          <div style={styles.contactRow} onClick={abrirMaps}>
            <div style={styles.iconBoxWrap}>
              <span style={styles.iconBox}>📍</span>
            </div>
            <div style={{ flex: 1 }}>
              <p style={styles.contactLabel}>Ubicación</p>
              <p style={styles.contactValor}>{lugar.direccion}</p>
            </div>
            <span style={styles.flecha}>→</span>
          </div>

          {lugar.telefono && (
            <div style={styles.contactRow} onClick={abrirWhatsApp}>
              <div style={{ ...styles.iconBoxWrap, background: 'rgba(37, 211, 102, 0.1)', borderColor: 'rgba(37, 211, 102, 0.2)' }}>
                <span style={styles.iconBox}>💬</span>
              </div>
              <div style={{ flex: 1 }}>
                <p style={styles.contactLabel}>WhatsApp</p>
                <p style={styles.contactValor}>{lugar.telefono}</p>
              </div>
              <span style={styles.flecha}>→</span>
            </div>
          )}
        </div>

        {/* HORARIOS */}
        <div style={styles.horariosSection}>
          <h4 style={styles.subtitulo}>Horarios de la semana</h4>

          {DIAS.map(dia => {
            const fecha = obtenerProximaFecha(dia);
            const excs = excepcionesDelDia(dia);
            const tieneCerrado = excs.find(e => e.cerrado);
            const tieneHorariosEspeciales = excs.filter(e => !e.cerrado);
            const horariosNormales = horariosPorDia(dia);
            const horariosAUsar = tieneHorariosEspeciales.length > 0
              ? tieneHorariosEspeciales.map(e => ({
                  id: e.id,
                  hora_inicio: e.hora_inicio,
                  hora_fin: e.hora_fin,
                  cupos: e.cupos,
                  reservados: e.reservados || 0,
                  dia,
                  esExcepcion: true,
                  excepcion_id: e.id,
                  tipo_cancha: e.tipo_cancha
                }))
              : horariosNormales;
            const motivo = excs[0]?.motivo;

            return (
              <div key={dia} style={styles.diaCard}>
                <div style={styles.diaHeader}>
                  <div>
                    <p style={styles.diaNombre}>{dia}</p>
                    <p style={styles.diaFecha}>{formatearFecha(fecha)}</p>
                  </div>
                  {tieneCerrado ? (
                    <span style={styles.cerradoBadge}>Cerrado</span>
                  ) : tieneHorariosEspeciales.length > 0 ? (
                    <span style={styles.especialBadge}>⚡ Especial</span>
                  ) : horariosNormales.length === 0 ? (
                    <span style={styles.sinHorarioBadge}>Sin horarios</span>
                  ) : null}
                </div>

                {tieneCerrado ? (
                  <div style={styles.motivoBox}>
                    <span>🔒</span>
                    <span>{motivo || 'Cerrado este día'}</span>
                  </div>
                ) : (
                  <div style={styles.horariosList}>
                    {tieneHorariosEspeciales.length > 0 && motivo && (
                      <div style={styles.motivoBox}>
                        <span>📌</span>
                        <span>{motivo}</span>
                      </div>
                    )}
                    {horariosAUsar.length === 0 ? (
                      <p style={styles.sinHorarioTexto}>No hay horarios para este día</p>
                    ) : (
                      horariosAUsar.map(h => {
                        const paso = horarioYaPaso(h, fecha);
                        const reserva = getReserva(h, fecha);
                        const puedeReservar = estadoInscripcion === 'aprobada' && !paso && !reserva;
                        const disponibles = h.cupos - (h.reservados || 0);
                        return (
                          <div
                            key={h.id}
                            style={{
                              ...styles.horarioItem,
                              opacity: paso ? 0.5 : 1,
                              borderColor: reserva ? 'var(--color-exito)' : h.esExcepcion ? 'var(--color-advertencia)' : 'var(--border-suave)',
                              background: reserva ? 'rgba(16, 185, 129, 0.05)' : h.esExcepcion ? 'rgba(245, 158, 11, 0.05)' : 'var(--bg-card)',
                            }}
                          >
                            <div style={styles.horarioInfo}>
                              <div style={styles.horarioTopRow}>
                                <span style={{
                                  ...styles.horarioHora,
                                  color: paso ? 'var(--text-suave)' : reserva ? 'var(--color-exito)' : h.esExcepcion ? 'var(--color-advertencia)' : 'var(--color-primario)',
                                }}>
                                  {formatHora(h.hora_inicio)} - {formatHora(h.hora_fin)}
                                </span>
                                {paso && <span style={styles.horarioEstado}>No disponible</span>}
                                {reserva && <span style={{ ...styles.horarioEstado, color: 'var(--color-exito)' }}>✓ Ya reservado</span>}
                                {h.esExcepcion && !paso && !reserva && <span style={{ ...styles.horarioEstado, color: 'var(--color-advertencia)' }}>Especial</span>}
                              </div>

                              <div style={styles.cuposRow}>
                                <span style={styles.cuposBadge}>
                                  {lugar.categoria === 'canchas' ? '⚽' : '👥'} {disponibles} / {h.cupos} {lugar.categoria === 'canchas' ? 'disponibles' : 'cupos'}
                                </span>
                                {lugar.categoria === 'canchas' && h.tipo_cancha && (
                                  <span style={styles.tipoCanchaBadge}>🏟️ {h.tipo_cancha}</span>
                                )}
                              </div>
                            </div>

                            <div style={styles.horarioBotones}>
                              {estadoInscripcion === 'aprobada' && !paso && (
                                <button style={styles.btnVerPersonas} onClick={() => verPersonas(h, fecha)}>
                                  👥 Ver
                                </button>
                              )}
                              {puedeReservar && (
                                <button style={styles.btnReservar} onClick={() => reservar(h, fecha)}>
                                  Reservar
                                </button>
                              )}
                              {paso && <span style={styles.btnPasado}>Finalizado</span>}
                              {reserva && !paso && (
                                <button style={styles.btnCancelar} onClick={() => cancelarReserva(reserva)}>
                                  Cancelar
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {renderBotonInscripcion()}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'var(--bg-app)',
    transition: 'background-color 0.3s ease',
  },
  loading: {
    minHeight: '100vh',
    background: 'var(--bg-app)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    color: 'var(--text-secundario)',
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    border: '3px solid var(--border-suave)',
    borderTopColor: 'var(--color-primario)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
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
    padding: '14px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    borderBottom: '1px solid var(--border-suave)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  btnVolver: {
    width: 40,
    height: 40,
    borderRadius: 'var(--radius-full)',
    background: 'var(--bg-hover)',
    border: '1px solid var(--border-suave)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    color: 'var(--text-principal)',
    fontWeight: 700,
  },
  btnVolverIcon: {
    fontSize: 18,
  },
  headerTitulo: {
    flex: 1,
    fontSize: 17,
    fontWeight: 700,
    color: 'var(--text-principal)',
    letterSpacing: '-0.01em',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 'var(--radius-full)',
    background: 'var(--bg-hover)',
    border: '1px solid var(--border-suave)',
    fontSize: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  carruselContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: '16/10',
    maxHeight: 400,
    background: '#000',
    overflow: 'hidden',
  },
  carruselImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    cursor: 'pointer',
  },
  carruselBtn: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(10px)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-full)',
    width: 40,
    height: 40,
    fontSize: 22,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carruselIndicadores: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    gap: 6,
  },
  indicador: {
    height: 8,
    borderRadius: 'var(--radius-full)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  miniaturasContainer: {
    display: 'flex',
    gap: 8,
    padding: '12px 20px 0',
    overflowX: 'auto',
    scrollbarWidth: 'none',
  },
  miniatura: {
    width: 60,
    height: 60,
    objectFit: 'cover',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all 0.2s ease',
  },
  content: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    paddingBottom: '40px',
  },
  infoLugar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 700,
    color: 'var(--text-principal)',
    letterSpacing: '-0.02em',
  },
  categoriaBadge: {
    background: 'var(--color-primario-suave)',
    color: 'var(--color-primario)',
    border: '1px solid var(--color-primario-borde)',
    fontSize: 11,
    fontWeight: 700,
    padding: '5px 11px',
    borderRadius: 'var(--radius-full)',
    textTransform: 'capitalize',
  },
  desc: {
    fontSize: 14,
    color: 'var(--text-secundario)',
    lineHeight: 1.6,
  },
  contactSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  contactRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 14px',
    cursor: 'pointer',
    border: '1px solid var(--border-suave)',
    boxShadow: 'var(--shadow-sm)',
    transition: 'all 0.2s ease',
  },
  iconBoxWrap: {
    width: 40,
    height: 40,
    borderRadius: 'var(--radius-md)',
    background: 'var(--color-primario-suave)',
    border: '1px solid var(--color-primario-borde)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconBox: {
    fontSize: 18,
  },
  contactLabel: {
    fontSize: 11,
    color: 'var(--text-suave)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contactValor: {
    fontSize: 14,
    color: 'var(--text-principal)',
    fontWeight: 600,
    marginTop: 2,
  },
  flecha: {
    color: 'var(--text-suave)',
    fontSize: 18,
  },
  horariosSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginTop: 8,
  },
  subtitulo: {
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--text-principal)',
    letterSpacing: '-0.01em',
    marginBottom: 4,
  },
  diaCard: {
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-md)',
    padding: '14px 16px',
    border: '1px solid var(--border-suave)',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  diaHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  diaNombre: {
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--text-principal)',
    textTransform: 'capitalize',
    letterSpacing: '-0.01em',
  },
  diaFecha: {
    fontSize: 12,
    color: 'var(--text-suave)',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  cerradoBadge: {
    background: 'rgba(239, 68, 68, 0.1)',
    color: 'var(--color-error)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    fontSize: 11,
    fontWeight: 700,
    padding: '5px 11px',
    borderRadius: 'var(--radius-full)',
  },
  especialBadge: {
    background: 'rgba(245, 158, 11, 0.1)',
    color: 'var(--color-advertencia)',
    border: '1px solid rgba(245, 158, 11, 0.2)',
    fontSize: 11,
    fontWeight: 700,
    padding: '5px 11px',
    borderRadius: 'var(--radius-full)',
  },
  sinHorarioBadge: {
    background: 'var(--bg-hover)',
    color: 'var(--text-suave)',
    fontSize: 11,
    fontWeight: 600,
    padding: '5px 11px',
    borderRadius: 'var(--radius-full)',
    border: '1px solid var(--border-suave)',
  },
  horariosList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  horarioItem: {
    borderRadius: 'var(--radius-md)',
    padding: '12px 14px',
    border: '1px solid',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  horarioInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  horarioTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  horarioHora: {
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: '-0.01em',
  },
  horarioEstado: {
    fontSize: 11,
    color: 'var(--text-suave)',
    fontWeight: 600,
  },
  cuposRow: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  },
  cuposBadge: {
    fontSize: 12,
    color: 'var(--text-secundario)',
    background: 'var(--bg-hover)',
    padding: '4px 10px',
    borderRadius: 'var(--radius-full)',
    fontWeight: 600,
  },
  tipoCanchaBadge: {
    fontSize: 11,
    color: 'var(--color-primario)',
    background: 'var(--color-primario-suave)',
    border: '1px solid var(--color-primario-borde)',
    padding: '4px 10px',
    borderRadius: 'var(--radius-full)',
    fontWeight: 700,
  },
  horarioBotones: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  },
  sinHorarioTexto: {
    fontSize: 13,
    color: 'var(--text-suave)',
    textAlign: 'center',
    padding: '8px 0',
    fontStyle: 'italic',
  },
  motivoBox: {
    fontSize: 12,
    color: 'var(--text-secundario)',
    fontStyle: 'italic',
    background: 'var(--bg-hover)',
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  btnReservar: {
    background: 'var(--color-primario)',
    color: '#fff',
    fontSize: 12,
    fontWeight: 600,
    padding: '7px 16px',
    borderRadius: 'var(--radius-full)',
    cursor: 'pointer',
    border: 'none',
  },
  btnVerPersonas: {
    background: 'var(--color-primario-suave)',
    color: 'var(--color-primario)',
    border: '1px solid var(--color-primario-borde)',
    fontSize: 12,
    fontWeight: 600,
    padding: '7px 14px',
    borderRadius: 'var(--radius-full)',
    cursor: 'pointer',
  },
  btnCancelar: {
    background: 'rgba(239, 68, 68, 0.1)',
    color: 'var(--color-error)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    fontSize: 12,
    fontWeight: 600,
    padding: '7px 14px',
    borderRadius: 'var(--radius-full)',
    cursor: 'pointer',
  },
  btnPasado: {
    background: 'var(--bg-hover)',
    color: 'var(--text-suave)',
    fontSize: 12,
    fontWeight: 600,
    padding: '7px 14px',
    borderRadius: 'var(--radius-full)',
    border: '1px solid var(--border-suave)',
  },
  btnInscribirse: {
    background: 'var(--color-primario)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: '15px',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 8,
    boxShadow: '0 4px 16px rgba(79, 70, 229, 0.3)',
    transition: 'all 0.2s ease',
  },
  inscritoBadge: {
    background: 'rgba(16, 185, 129, 0.1)',
    color: 'var(--color-exito)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: 'var(--radius-md)',
    padding: '15px',
    fontSize: 14,
    fontWeight: 700,
    textAlign: 'center',
    marginTop: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pendienteBadge: {
    background: 'rgba(245, 158, 11, 0.1)',
    color: 'var(--color-advertencia)',
    border: '1px solid rgba(245, 158, 11, 0.2)',
    borderRadius: 'var(--radius-md)',
    padding: '15px',
    fontSize: 14,
    fontWeight: 700,
    textAlign: 'center',
    marginTop: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  rechazadoBadge: {
    background: 'rgba(239, 68, 68, 0.1)',
    color: 'var(--color-error)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: 'var(--radius-md)',
    padding: '15px',
    fontSize: 14,
    fontWeight: 700,
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  badgeIcon: {
    fontSize: 16,
  },
  // Modal
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: '20px',
  },
  modal: {
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-xl)',
    padding: '24px',
    width: '100%',
    maxWidth: 440,
    maxHeight: '85vh',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    border: '1px solid var(--border-suave)',
    boxShadow: 'var(--shadow-lg)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  modalTitulo: {
    fontSize: 17,
    fontWeight: 700,
    color: 'var(--text-principal)',
    letterSpacing: '-0.01em',
  },
  modalSub: {
    fontSize: 13,
    color: 'var(--text-secundario)',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  modalSubHora: {
    fontSize: 13,
    color: 'var(--color-primario)',
    fontWeight: 600,
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
    flexShrink: 0,
  },
  modalContador: {
    background: 'var(--color-primario-suave)',
    border: '1px solid var(--color-primario-borde)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
  },
  modalContadorNum: {
    fontSize: 24,
    fontWeight: 800,
    color: 'var(--color-primario)',
    letterSpacing: '-0.02em',
  },
  modalContadorTexto: {
    fontSize: 13,
    color: 'var(--text-secundario)',
    fontWeight: 500,
  },
  modalVacio: {
    textAlign: 'center',
    padding: '24px 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  modalVacioTexto: {
    fontSize: 13,
    color: 'var(--text-suave)',
  },
  modalLista: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    maxHeight: 280,
    overflowY: 'auto',
  },
  modalPersona: {
    background: 'var(--bg-hover)',
    border: '1px solid var(--border-suave)',
    borderRadius: 'var(--radius-md)',
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  modalAvatar: {
    width: 36,
    height: 36,
    borderRadius: 'var(--radius-full)',
    background: 'linear-gradient(135deg, var(--color-primario) 0%, var(--color-primario-hover) 100%)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 14,
    boxShadow: '0 4px 8px rgba(79, 70, 229, 0.2)',
  },
  modalNombre: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-principal)',
  },
  btnReservarModal: {
    padding: '13px',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    background: 'var(--color-primario)',
    color: '#fff',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    marginTop: 8,
    boxShadow: '0 4px 16px rgba(79, 70, 229, 0.3)',
  },
  btnCancelarModal: {
    padding: '13px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    background: 'rgba(239, 68, 68, 0.1)',
    color: 'var(--color-error)',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    marginTop: 8,
  },
  // Lightbox
  lightboxOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.95)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    cursor: 'pointer',
  },
  lightboxImg: {
    maxWidth: '95%',
    maxHeight: '85%',
    objectFit: 'contain',
    cursor: 'default',
    borderRadius: 'var(--radius-md)',
  },
  lightboxCerrar: {
    position: 'absolute',
    top: 16,
    right: 16,
    background: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(10px)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.2)',
    fontSize: 18,
    fontWeight: 700,
    width: 44,
    height: 44,
    borderRadius: 'var(--radius-full)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxNav: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(10px)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.2)',
    fontSize: 28,
    fontWeight: 700,
    width: 52,
    height: 52,
    borderRadius: 'var(--radius-full)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxContador: {
    position: 'absolute',
    bottom: 24,
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    background: 'rgba(0,0,0,0.5)',
    padding: '6px 14px',
    borderRadius: 'var(--radius-full)',
  },
};