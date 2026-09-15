import { useEffect, useState } from 'react';
import API from '../../services/api';

const AdminInscripciones = ({ lugar, mostrarMensaje, styles }) => {
  const [inscripciones, setInscripciones] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [confirmarEliminar, setConfirmarEliminar] = useState(null);

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

  const eliminarInscripcion = async (id) => {
    try {
      await API.delete(`/admin/inscripciones/${id}`);
      setInscripciones(prev => prev.filter(i => i.id !== id));
      setConfirmarEliminar(null);
      mostrarMensaje('Inscripción eliminada');
    } catch (err) {
      mostrarMensaje('Error al eliminar');
    }
  };

  const filtrados = inscripciones.filter(i => {
    if (!busqueda.trim()) return true;

    const q = busqueda.toLowerCase();

    return (
      i.nombre?.toLowerCase().includes(q) ||
      i.apellido?.toLowerCase().includes(q) ||
      i.correo?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={styles.tabContent}>
      {confirmarEliminar && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <p style={styles.cardTitulo}>Confirmar eliminación</p>

            <p style={styles.cardSub}>
              ¿Estás seguro que deseas eliminar a{' '}
              <strong>
                {confirmarEliminar.nombre} {confirmarEliminar.apellido}
              </strong>{' '}
              del lugar? Esta acción no se puede deshacer.
            </p>

            <div style={styles.botonesRow}>
              <button
                style={styles.btnPeligro}
                onClick={() => eliminarInscripcion(confirmarEliminar.id)}
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

      <div style={styles.searchBoxAdmin}>
        <span style={{ fontSize: 16, opacity: 0.6 }}>🔍</span>

        <input
          style={styles.searchInputAdmin}
          placeholder="Buscar por nombre, apellido o correo..."
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
              <div style={styles.cardIcono}>
                {i.nombre?.charAt(0).toUpperCase()}
              </div>

              <div style={{ flex: 1 }}>
                <p style={styles.cardTitulo}>
                  {i.nombre} {i.apellido}
                </p>

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