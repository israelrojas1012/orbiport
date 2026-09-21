import { useEffect, useState } from 'react';
import API from '../../services/api';
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

const AdminInscripciones = ({ lugar, mostrarMensaje, styles }) => {
  const [inscripciones, setInscripciones] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [confirmarEliminar, setConfirmarEliminar] = useState(null);
  const [historialPagos, setHistorialPagos] = useState(null);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [gestionarMembresia, setGestionarMembresia] = useState(null);
  const [guardandoMembresia, setGuardandoMembresia] = useState(false);

  const cargarInscripciones = async () => {
    if (!lugar?.id) return;

    try {
      const res = await API.get(`/admin/inscripciones/${lugar.id}`);
      setInscripciones(res.data);
    } catch (err) {
      console.error('Error al cargar inscripciones:', err);
    }
  };

  useEffect(() => {
    cargarInscripciones();
  }, [lugar?.id]);

  const cambiarEstado = async (id, estado) => {
    try {
      await API.put(`/admin/inscripciones/${id}`, { estado });
      setInscripciones(prev =>
        prev.map(i => i.id === id ? { ...i, estado } : i)
      );
    } catch (err) {
      mostrarMensaje('Error al actualizar inscripción');
    }
  };

  const abrirHistorialPagos = async (inscripcion) => {
    try {
      setCargandoHistorial(true);

      const res = await API.get(
        `/asistencia/historial-pagos/${inscripcion.usuario_id}/${lugar.id}`
      );

      setHistorialPagos({
        usuario: inscripcion,
        movimientos: res.data
      });
    } catch (err) {
      mostrarMensaje(
        err.response?.data?.error || 'Error al obtener historial de pagos'
      );
    } finally {
      setCargandoHistorial(false);
    }
  };

  const formatearFecha = fecha => {
    if (!fecha) return 'No registrado';

    return new Intl.DateTimeFormat('es-EC', {
      timeZone: 'America/Guayaquil',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(fecha));
  };

  const formatearFechaHora = fecha => {
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

  const formatearHora = hora => {
    if (!hora) return 'No registrada';

    return String(hora).slice(0, 5);
  };

  const eliminarInscripcion = async (id, confirmar = false) => {
    try {
      await API.delete(`/admin/inscripciones/${id}`, {
        data: {
          confirmar_eliminacion: confirmar
        }
      });

      setInscripciones(prev =>
        prev.filter(x => x.id !== id)
      );

      setConfirmarEliminar(null);

      mostrarMensaje(
        confirmar
          ? 'Usuario eliminado y reservas futuras canceladas'
          : 'Inscripción eliminada'
      );
    } catch (err) {
      if (
        err.response?.status === 409 &&
        err.response?.data?.advertencia
      ) {
        setConfirmarEliminar({
          ...confirmarEliminar,
          advertencia: err.response.data.advertencia
        });
        return;
      }

      mostrarMensaje(
        err.response?.data?.error || 'Error al eliminar'
      );
    }
  };

  const filtrados = inscripciones.filter(i => {
    const abrirGestionMembresia = inscripcion => {
      let fecha = '';

      if (inscripcion.membresia_hasta) {
        fecha = String(inscripcion.membresia_hasta).slice(0, 10);
      }

      setGestionarMembresia({
        ...inscripcion,
        membresia_hasta: fecha,
        limite_reservas:
          inscripcion.limite_reservas === null ||
          inscripcion.limite_reservas === undefined
            ? ''
            : String(inscripcion.limite_reservas)
      });
    };

    const guardarMembresia = async () => {
      if (!gestionarMembresia) return;

      try {
        setGuardandoMembresia(true);

        await API.put(
          `/admin/inscripciones/${gestionarMembresia.id}/membresia`,
          {
            membresia_hasta:
              gestionarMembresia.membresia_hasta || null,

            limite_reservas:
              gestionarMembresia.limite_reservas === ''
                ? null
                : Number(gestionarMembresia.limite_reservas)
          }
        );

        await cargarInscripciones();

        setGestionarMembresia(null);

        mostrarMensaje('Membresía actualizada correctamente');
      } catch (err) {
        mostrarMensaje(
          err.response?.data?.error ||
          'Error al actualizar membresía'
        );
      } finally {
        setGuardandoMembresia(false);
      }
    };
    if (!busqueda.trim()) return true;

    const q = busqueda.toLowerCase();

    return (
      i.nickname?.toLowerCase().includes(q) ||
      i.nombre?.toLowerCase().includes(q) ||
      i.apellido?.toLowerCase().includes(q) ||
      i.correo?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={styles.tabContent}>
      {gestionarMembresia && (
        <div style={styles.modalOverlay}>
          <div
            style={{
              ...styles.modal,
              maxWidth: 500
            }}
          >
            <p style={styles.cardTitulo}>
              🎟 Gestionar membresía
            </p>

            <p style={styles.cardSub}>
              {gestionarMembresia.nickname
                ? `@${gestionarMembresia.nickname}`
                : `${gestionarMembresia.nombre} ${gestionarMembresia.apellido}`}
              {' · '}
              {lugar.nombre}
            </p>

            <div style={{ marginTop: 20 }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: 6,
                  color: 'var(--text-principal)',
                  fontWeight: 600
                }}
              >
                Fecha límite de membresía
              </label>

              <input
                type="date"
                value={gestionarMembresia.membresia_hasta}
                onChange={e =>
                  setGestionarMembresia(prev => ({
                    ...prev,
                    membresia_hasta: e.target.value
                  }))
                }
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: 12,
                  borderRadius: 10,
                  border: '1px solid var(--border-suave)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-principal)'
                }}
              />

              <p
                style={{
                  ...styles.cardSub,
                  marginTop: 6
                }}
              >
                Déjalo vacío si la membresía no tiene fecha límite.
              </p>
            </div>

            <div style={{ marginTop: 18 }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: 6,
                  color: 'var(--text-principal)',
                  fontWeight: 600
                }}
              >
                Límite de reservas
              </label>

              <input
                type="number"
                min="0"
                step="1"
                placeholder="Ej: 14"
                value={gestionarMembresia.limite_reservas}
                onChange={e =>
                  setGestionarMembresia(prev => ({
                    ...prev,
                    limite_reservas: e.target.value
                  }))
                }
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: 12,
                  borderRadius: 10,
                  border: '1px solid var(--border-suave)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-principal)'
                }}
              />

              <p
                style={{
                  ...styles.cardSub,
                  marginTop: 6
                }}
              >
                Ejemplo: 14 permite realizar hasta 14 reservas.
                Las reservas canceladas no consumirán el límite.
              </p>
            </div>

            <div
              style={{
                ...styles.botonesRow,
                marginTop: 22
              }}
            >
              <button
                style={styles.btnAprobar}
                onClick={guardarMembresia}
                disabled={guardandoMembresia}
              >
                {guardandoMembresia
                  ? 'Guardando...'
                  : 'Guardar membresía'}
              </button>

              <button
                style={styles.btnCancelar}
                onClick={() => setGestionarMembresia(null)}
                disabled={guardandoMembresia}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmarEliminar && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <p style={styles.cardTitulo}>Confirmar eliminación</p>

            <p style={styles.cardSub}>
              {confirmarEliminar.advertencia ? (
                <>
                  <strong>
                    Este usuario tiene un saldo pendiente de $
                    {Number(
                      confirmarEliminar.advertencia.saldo_pendiente
                    ).toFixed(2)}
                    {' '}y{' '}
                    {confirmarEliminar.advertencia.reservas_futuras}
                    {' '}
                    reserva
                    {confirmarEliminar.advertencia.reservas_futuras !== 1 ? 's' : ''}
                    {' '}futura
                    {confirmarEliminar.advertencia.reservas_futuras !== 1 ? 's' : ''}.
                  </strong>

                  <br /><br />

                  Si lo eliminas, las reservas futuras se cancelarán
                  automáticamente, pero el saldo pendiente
                  <strong> no se eliminará</strong>. Permanecerá registrado
                  hasta que el administrador registre el pago y confirme
                  que la deuda fue saldada.
                </>
              ) : (
                <>
                  ¿Estás seguro que deseas eliminar a{' '}
                  <strong>
                    {confirmarEliminar.nombre} {confirmarEliminar.apellido}
                  </strong>
                  {' '}del lugar? Esta acción no se puede deshacer.
                </>
              )}
            </p>

            <div style={styles.botonesRow}>
              <button
                style={styles.btnPeligro}
                onClick={() =>
                  eliminarInscripcion(
                    confirmarEliminar.id,
                    !!confirmarEliminar.advertencia
                  )
                }
              >
                Sí, eliminar
              </button>

              <button
                style={styles.btnCancelar}
                onClick={() => setConfirmarEliminar(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {historialPagos && (
        <div style={styles.modalOverlay}>
          <div
            style={{
              ...styles.modal,
              maxWidth: 560,
              maxHeight: '85vh',
              overflowY: 'auto'
            }}
          >
            <p style={styles.cardTitulo}>
              Historial de pagos
            </p>

            <p style={styles.cardSub}>
              {historialPagos.usuario.nickname
                ? `@${historialPagos.usuario.nickname}`
                : `${historialPagos.usuario.nombre} ${historialPagos.usuario.apellido}`}
              {' · '}
              {lugar.nombre}
            </p>

            {historialPagos.movimientos.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '30px 10px'
                }}
              >
                <div style={{ fontSize: 32 }}>🧾</div>

                <p style={styles.cardSub}>
                  Este usuario no tiene movimientos registrados en este lugar.
                </p>
              </div>
            ) : (
              historialPagos.movimientos.map(m => {
                const monto = Number(m.monto || 0);
                const pagado = Number(m.pagado || 0);
                const saldo = Number(m.saldo_restante || 0);

                return (
                  <div
                    key={m.id}
                    style={{
                      marginTop: 14,
                      padding: 14,
                      borderRadius: 14,
                      border: '1px solid var(--border-suave)',
                      background: 'var(--bg-card)'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 10,
                        alignItems: 'center'
                      }}
                    >
                      <strong style={{ color: 'var(--text-principal)' }}>
                        ${monto.toFixed(2)}
                      </strong>

                      <span
                        style={{
                          ...styles.badge,
                          color:
                            m.estado === 'pagado'
                              ? 'var(--color-exito)'
                              : 'var(--color-advertencia)'
                        }}
                      >
                        {m.estado === 'pagado' ? 'Pagado' : 'Pendiente'}
                      </span>
                    </div>

                    <p style={{ ...styles.cardSub, marginTop: 10 }}>
                      Reserva: {formatearFecha(m.fecha_reserva)}
                      {' · '}
                      {formatearHora(m.hora_inicio)}
                    </p>

                    <p style={styles.cardSub}>
                      Cargo generado: {formatearFechaHora(
                        m.fecha_creacion_penalizacion
                      )}
                    </p>

                    <p style={styles.cardSub}>
                      Pagado: ${pagado.toFixed(2)}
                      {' · '}
                      Saldo: ${saldo.toFixed(2)}
                    </p>

                    <p style={styles.cardSub}>
                      Pago registrado:{' '}
                      {m.estado !== 'pagado' && !m.fecha_ultimo_pago
                        ? 'Pendiente'
                        : m.fecha_ultimo_pago
                          ? formatearFechaHora(m.fecha_ultimo_pago)
                          : 'No registrado'}
                    </p>
                  </div>
                );
              })
            )}

            <div
              style={{
                ...styles.botonesRow,
                marginTop: 18
              }}
            >
              <button
                style={styles.btnCancelar}
                onClick={() => setHistorialPagos(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.searchBoxAdmin}>
        <span style={{ fontSize: 16, opacity: 0.6 }}>🔍</span>

        <input
          style={styles.searchInputAdmin}
          placeholder="Buscar por nickname, nombre, apellido o correo..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />

        {busqueda && (
          <button
            style={styles.clearBtnAdmin}
            onClick={() => setBusqueda('')}
          >
            ✕
          </button>
        )}
      </div>

      {inscripciones.length === 0 ? (
        <div style={styles.vacio}>
          <div style={styles.vacioIcon}>👥</div>
          <p style={styles.vacioTexto}>No hay solicitudes aún</p>
        </div>
      ) : filtrados.length === 0 ? (
        <div style={styles.vacio}>
          <div style={styles.vacioIcon}>🔍</div>
          <p style={styles.vacioTexto}>
            No se encontró a nadie con ese nombre
          </p>
        </div>
      ) : (
        filtrados.map(i => (
          <div key={i.id} style={styles.card}>
            <div style={styles.cardHeaderRow}>
              <div
                style={{
                  ...styles.cardIcono,
                  fontSize: 24
                }}
              >
                {obtenerAvatar(i.avatar)}
              </div>

              <div style={{ flex: 1 }}>
                <p style={styles.cardTitulo}>
                  {i.nickname ? `@${i.nickname}` : `${i.nombre} ${i.apellido}`}
                </p>

                {i.nickname && (
                  <p style={styles.cardSub}>
                    {i.nombre} {i.apellido}
                  </p>
                )}

                <p style={styles.cardSub}>
                  {i.correo}
                </p>
              </div>

              <span
                style={{
                  ...styles.badge,
                  background:
                    i.estado === 'aprobada'
                      ? 'rgba(16, 185, 129, 0.1)'
                      : i.estado === 'rechazada'
                        ? 'rgba(239, 68, 68, 0.1)'
                        : 'rgba(245, 158, 11, 0.1)',
                  color:
                    i.estado === 'aprobada'
                      ? 'var(--color-exito)'
                      : i.estado === 'rechazada'
                        ? 'var(--color-error)'
                        : 'var(--color-advertencia)',
                  borderColor:
                    i.estado === 'aprobada'
                      ? 'rgba(16, 185, 129, 0.2)'
                      : i.estado === 'rechazada'
                        ? 'rgba(239, 68, 68, 0.2)'
                        : 'rgba(245, 158, 11, 0.2)',
                }}
              >
                {i.estado}
              </span>
            </div>

            {i.estado === 'pendiente' && (
              <div style={styles.acciones}>
                <button
                  style={styles.btnAprobar}
                  onClick={() => cambiarEstado(i.id, 'aprobada')}
                >
                  ✓ Aprobar
                </button>

                <button
                  style={styles.btnRechazar}
                  onClick={() => cambiarEstado(i.id, 'rechazada')}
                >
                  ✕ Rechazar
                </button>
              </div>
            )}

            {i.estado === 'aprobada' && (
              <div style={styles.acciones}>
                <button
                  style={styles.btnAprobar}
                  onClick={() => abrirHistorialPagos(i)}
                  disabled={cargandoHistorial}
                >
                  🧾 Historial de pagos
                </button>

                <button
                  style={styles.btnAprobar}
                  onClick={() => abrirGestionMembresia(i)}
                >
                  🎟 Gestionar membresía
                </button>

                <button
                  style={styles.btnPeligro}
                  onClick={() => setConfirmarEliminar(i)}
                >
                  Eliminar del lugar
                </button>
              </div>
            )}

            {i.estado === 'rechazada' && (
              <div style={styles.acciones}>
                <button
                  style={styles.btnAprobar}
                  onClick={() => cambiarEstado(i.id, 'aprobada')}
                >
                  ✓ Aprobar
                </button>

                <button
                  style={styles.btnPeligro}
                  onClick={() => setConfirmarEliminar(i)}
                >
                  Eliminar
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default AdminInscripciones;