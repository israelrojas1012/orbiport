import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useTheme } from '../context/ThemeContext';
import ConfirmarSalida from '../components/ConfirmarSalida';
import detalleLugarStyles from '../styles/detalleLugarStyles';

const styles = detalleLugarStyles;
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
  const [conflictoReserva, setConflictoReserva] = useState(null);
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  const [salidaBloqueada, setSalidaBloqueada] = useState(null);
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

  const reservar = async (horario, fecha, forzarConflicto = false) => {
    try {
      const fechaStr = formatearFechaLocal(fecha);
      const ahora = new Date();
      const [h, m] = horario.hora_inicio.split(':');
      const horaInicio = new Date(fecha);

      horaInicio.setHours(
        parseInt(h),
        parseInt(m),
        0,
        0
      );

      const diff =
        (horaInicio - ahora) / (1000 * 60 * 60);

      if (diff < 2) {
        mostrarToast(
          'Solo puedes reservar con al menos 2 horas de anticipación',
          'error'
        );
        return;
      }

      const payload = horario.esExcepcion
        ? {
            excepcion_id: horario.id,
            fecha: fechaStr,
            confirmar_conflicto: forzarConflicto
          }
        : {
            horario_id: horario.id,
            fecha: fechaStr,
            confirmar_conflicto: forzarConflicto
          };

      const res = await API.post('/reservas', payload);

      setReservasHechas(prev => [
        ...prev,
        {
          ...res.data,
          horario_id: horario.esExcepcion
            ? null
            : horario.id,
          excepcion_id: horario.esExcepcion
            ? horario.id
            : null,
          fecha: fechaStr,
          hora_inicio: horario.hora_inicio,
          hora_fin: horario.hora_fin,
          dia: horario.dia
        }
      ]);

      if (horario.esExcepcion) {
        const actualizadas = await API.get(
          `/lugares/excepciones/lugar/${id}`
        );
        setExcepciones(actualizadas.data);
      } else {
        const actualizados = await API.get(
          `/admin/horarios/${id}`
        );
        setHorarios(actualizados.data);
      }

      mostrarToast(
        `¡Reserva confirmada! ${formatearFecha(fecha)} ${formatHora(horario.hora_inicio)}`,
        'exito'
      );
    } catch (err) {
      if (
        err.response?.status === 409 &&
        err.response?.data?.conflicto
      ) {
        setConflictoReserva({
          horario,
          fecha,
          conflicto: err.response.data.conflicto
        });
        return;
      }

      mostrarToast(
        err.response?.data?.error || 'Error al reservar',
        'error'
      );
    }
  };

  const cancelarReserva = async (reserva) => {
    try {
      await API.delete(`/reservas/${reserva.id}`);

      setReservasHechas(prev =>
        prev.filter(r => r.id !== reserva.id)
      );

      if (reserva.excepcion_id) {
        const actualizadas = await API.get(
          `/lugares/excepciones/lugar/${id}`
        );
        setExcepciones(actualizadas.data);
      } else {
        const actualizados = await API.get(
          `/admin/horarios/${id}`
        );
        setHorarios(actualizados.data);
      }

      mostrarToast(
        'Reserva cancelada correctamente',
        'exito'
      );
    } catch (err) {
      mostrarToast(
        err.response?.data?.error || 'Error al cancelar',
        'error'
      );
    }
  };

  const inscribirse = async () => {
    try {
      await API.post('/inscripciones', { lugar_id: id });
      setEstadoInscripcion('pendiente');
      mostrarToast('Solicitud enviada, espera la aprobación del administrador.', 'exito');
    } catch (err) {
      mostrarToast(err.response?.data?.error || 'Error al inscribirse', 'error');
    }
  };

  const cancelarSolicitud = async () => {
    try {
      await API.delete(`/inscripciones/cancelar/${usuario.id}/${id}`);
      setEstadoInscripcion(null);
      mostrarToast('Solicitud cancelada correctamente.', 'exito');
    } catch (err) {
      mostrarToast(err.response?.data?.error || 'Error al cancelar', 'error');
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

  const solicitarSalida = () => {
    setConfirmarSalida(true);
  };

  const ejecutarSalida = async () => {
    try {
      await API.delete(
        `/inscripciones/salir/${usuario.id}/${id}`
      );

      setConfirmarSalida(false);
      setEstadoInscripcion(null);

      mostrarToast(
        'Has salido del lugar correctamente',
        'exito'
      );

      setTimeout(() => navigate('/home'), 800);
    } catch (err) {
      setConfirmarSalida(false);

      if (err.response?.status === 409) {
        setSalidaBloqueada({
          saldo: Number(err.response.data.saldo_pendiente || 0),
          reservas: Number(err.response.data.reservas_futuras || 0)
        });
        return;
      }

      mostrarToast(
        err.response?.data?.error || 'Error al salir del lugar',
        'error'
      );
    }
  };

  const obtenerMensajeSalidaBloqueada = () => {
    const saldo = salidaBloqueada?.saldo || 0;
    const reservas = salidaBloqueada?.reservas || 0;

    if (saldo > 0 && reservas > 0) {
      return `Tienes un saldo pendiente de $${saldo.toFixed(2)} y ${reservas} reserva${reservas !== 1 ? 's' : ''} futura${reservas !== 1 ? 's' : ''} en este lugar. Antes de salir, paga el saldo y cancela tus reservas.`;
    }

    if (saldo > 0) {
      return `Tienes un saldo pendiente de $${saldo.toFixed(2)} en este lugar. Antes de salir, debes cancelar la deuda con el administrador.`;
    }

    return `Tienes ${reservas} reserva${reservas !== 1 ? 's' : ''} futura${reservas !== 1 ? 's' : ''} en este lugar. Antes de salir, debes cancelarlas.`;
  };

  const renderBotonInscripcion = () => {
    if (estadoInscripcion === 'aprobada') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={styles.inscritoBadge}>
            <span style={styles.badgeIcon}>✓</span>
            <span>Ya estás inscrito en este lugar</span>
          </div>

          <button
            style={{
              ...styles.pendienteBadge,
              background: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--color-error)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              cursor: 'pointer',
            }}
            onClick={solicitarSalida}
          >
            <span>Salir del lugar</span>
          </button>
        </div>
      );
    }
    if (estadoInscripcion === 'pendiente') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={styles.pendienteBadge}>
            <span style={styles.badgeIcon}>⏳</span>
            <span>Solicitud pendiente de aprobación</span>
          </div>
          <button
            style={{
              ...styles.pendienteBadge,
              background: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--color-error)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              cursor: 'pointer',
            }}
            onClick={cancelarSolicitud}
          >
            <span>✕</span>
            <span>Cancelar solicitud</span>
          </button>
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

      <ConfirmarSalida
        abierto={confirmarSalida}
        onCancelar={() => setConfirmarSalida(false)}
        onConfirmar={ejecutarSalida}
        titulo="Cancelar inscripción"
        texto={`¿Estás seguro de que deseas salir de ${lugar.nombre}? Si sales, tendrás que volver a inscribirte para reservar nuevamente.`}
        textoConfirmar="Sí, salir"
      />

      {salidaBloqueada && (
        <ConfirmarSalida
          abierto={true}
          soloAviso={true}
          onCancelar={() => setSalidaBloqueada(null)}
          onConfirmar={() => setSalidaBloqueada(null)}
          titulo="No puedes salir todavía"
          texto={
            salidaBloqueada.saldo > 0 && salidaBloqueada.reservas > 0
              ? `Tienes un saldo pendiente de $${salidaBloqueada.saldo.toFixed(2)} y ${salidaBloqueada.reservas} reservas futuras en este lugar. Debes resolver estos pendientes antes de salir.`
              : salidaBloqueada.saldo > 0
                ? `Tienes un saldo pendiente de $${salidaBloqueada.saldo.toFixed(2)} en este lugar. Debes cancelar la deuda antes de salir.`
                : `Tienes ${salidaBloqueada.reservas} reservas futuras en este lugar. Debes cancelarlas antes de salir.`
          }
          textoConfirmar="Entendido"
        />
      )}

      {conflictoReserva && (
        <ConfirmarSalida
          abierto={true}
          onCancelar={() => setConflictoReserva(null)}
          onConfirmar={() => {
            const conflicto = conflictoReserva;

            setConflictoReserva(null);

            reservar(
              conflicto.horario,
              conflicto.fecha,
              true
            );
          }}
          titulo="Horario en conflicto"
          texto={`Ya tienes una reserva en ${conflictoReserva.conflicto.lugar_nombre || 'otro lugar'} de ${formatHora(conflictoReserva.conflicto.hora_inicio)} a ${formatHora(conflictoReserva.conflicto.hora_fin)}. El nuevo horario es de ${formatHora(conflictoReserva.horario.hora_inicio)} a ${formatHora(conflictoReserva.horario.hora_fin)}. ¿Deseas reservar de todos modos?`}
          textoConfirmar="Sí, reservar"
        />
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
                      <div
                        style={{
                          ...styles.modalAvatar,
                          fontSize: 24
                        }}
                      >
                        {obtenerAvatar(p.avatar)}
                      </div>

                      <span style={styles.modalNombre}>
                        {p.nickname
                          ? `@${p.nickname}`
                          : `${p.nombre || ''} ${p.apellido || ''}`.trim() || 'Usuario'}
                      </span>
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
                  tipo_cancha: e.tipo_cancha,
                  instructor: e.instructor || '',
                  descripcion: e.descripcion || ''
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
                              {(h.instructor || h.descripcion) && (
                                <div
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 4,
                                    marginTop: 8
                                  }}
                                >
                                  {h.instructor && (
                                    <span
                                      style={{
                                        fontSize: 12,
                                        color: 'var(--text-secundario)',
                                        fontWeight: 600
                                      }}
                                    >
                                      👤 Instructor: {h.instructor}
                                    </span>
                                  )}

                                  {h.descripcion && (
                                    <span
                                      style={{
                                        fontSize: 12,
                                        color: 'var(--text-suave)',
                                        lineHeight: 1.4
                                      }}
                                    >
                                      📝 {h.descripcion}
                                    </span>
                                  )}
                                </div>
                              )}
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

