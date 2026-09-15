import { useEffect, useState } from 'react';
import API from '../../services/api';

const AdminAsistencias = ({ lugar, mostrarMensaje, styles }) => {
  const [fechaAsistencia, setFechaAsistencia] = useState(() => {
    const hoy = new Date();
    return new Date(hoy.getTime() - hoy.getTimezoneOffset() * 60000)
      .toISOString()
      .split('T')[0];
  });

  const [listaAsistencia, setListaAsistencia] = useState([]);
  const [saldos, setSaldos] = useState([]);
  const [pagoForm, setPagoForm] = useState({});
  const [busquedaSaldos, setBusquedaSaldos] = useState('');
  const [mensajeAsistencia, setMensajeAsistencia] = useState('');
  const [horariosDelDia, setHorariosDelDia] = useState([]);
  const [horarioActivo, setHorarioActivo] = useState(null);

  const cargarAsistencia = async (fecha) => {
    if (!lugar?.id || !fecha) return;

    try {
      const res = await API.get(`/asistencia/horarios-dia/${lugar.id}/${fecha}`);
      setHorariosDelDia(res.data);
      setListaAsistencia([]);
      setHorarioActivo(null);
    } catch (err) {
      mostrarMensaje('Error al cargar horarios');
    }
  };

  const cargarReservasHorario = async (horario) => {
    try {
      const res = await API.get(
        `/asistencia/horario/${horario.horario_id}/${fechaAsistencia}`
      );
      setListaAsistencia(res.data);
      setHorarioActivo(horario);
    } catch (err) {
      mostrarMensaje('Error al cargar reservas');
    }
  };

  const cargarSaldos = async () => {
    if (!lugar?.id) return;

    try {
      const res = await API.get(`/asistencia/saldos/${lugar.id}`);
      setSaldos(res.data);
    } catch (err) {
      mostrarMensaje('Error al cargar saldos');
    }
  };

  const marcarAsistencia = async (reserva_id, usuario_id, asistio) => {
    try {
      await API.post('/asistencia/marcar', {
        reserva_id,
        usuario_id,
        lugar_id: lugar.id,
        fecha: fechaAsistencia,
        asistio
      });

      await cargarReservasHorario(horarioActivo);
      await cargarSaldos();

      setMensajeAsistencia(
        asistio
          ? 'Asistencia marcada'
          : 'Falta registrada y notificación enviada'
      );

      setTimeout(() => setMensajeAsistencia(''), 3000);
    } catch (err) {
      setMensajeAsistencia('Error al marcar asistencia');
    }
  };

  const marcarTodos = async () => {
    try {
      await API.post('/asistencia/todos', {
        lugar_id: lugar.id,
        fecha: fechaAsistencia
      });

      await cargarReservasHorario(horarioActivo);

      setMensajeAsistencia('Todos marcados como asistieron');
      setTimeout(() => setMensajeAsistencia(''), 3000);
    } catch (err) {
      setMensajeAsistencia('Error al marcar asistencias');
    }
  };

  const registrarPagoLibre = async (usuario_id, monto) => {
    if (!monto || parseFloat(monto) <= 0) {
      return mostrarMensaje('Ingresa un monto válido');
    }

    try {
      await API.put(
        `/asistencia/saldos/${usuario_id}/${lugar.id}/pago`,
        { monto_pagado: monto }
      );

      setPagoForm({});
      await cargarSaldos();
      mostrarMensaje('Pago registrado correctamente');
    } catch (err) {
      mostrarMensaje('Error al registrar pago');
    }
  };

  useEffect(() => {
    if (lugar?.id) cargarSaldos();
  }, [lugar?.id]);

  const conSaldo = saldos.filter(
    s => parseFloat(s.saldo_pendiente) > 0
  );

  const filtrados = conSaldo.filter(s => {
    if (!busquedaSaldos.trim()) return true;

    const q = busquedaSaldos.toLowerCase();

    return (
      s.nombre?.toLowerCase().includes(q) ||
      s.apellido?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={styles.tabContent}>
      <div style={styles.card}>
        <p style={styles.cardTitulo}>Pasar lista</p>
        <p style={styles.cardSub}>
          Selecciona la fecha para ver las reservas
        </p>

        <input
          style={styles.input}
          type="date"
          value={fechaAsistencia}
          onChange={e => {
            setFechaAsistencia(e.target.value);
            cargarAsistencia(e.target.value);
          }}
        />

        <button
          style={styles.btnAgregar}
          onClick={() => cargarAsistencia(fechaAsistencia)}
        >
          Cargar lista
        </button>

        {mensajeAsistencia && (
          <p style={styles.exitoTexto}>{mensajeAsistencia}</p>
        )}
      </div>

      {horariosDelDia.length > 0 && !horarioActivo && (
        <div style={styles.card}>
          <p style={styles.cardTitulo}>Horarios con reservas</p>
          <p style={styles.cardSub}>
            {new Date(`${fechaAsistencia}T00:00:00`).toLocaleDateString(
              'es-EC',
              { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
            )}
          </p>

          {horariosDelDia.map(h => (
            <div
              key={h.horario_id}
              style={{ ...styles.horarioRow, cursor: 'pointer' }}
              onClick={() => cargarReservasHorario(h)}
            >
              <div style={{ flex: 1 }}>
                <p style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--color-primario)'
                }}>
                  {h.hora_inicio} - {h.hora_fin}
                </p>

                <p style={{
                  fontSize: 12,
                  color: 'var(--text-suave)',
                  marginTop: 2
                }}>
                  {h.reservados} de {h.cupos} cupos reservados
                </p>
              </div>

              <button style={styles.btnAprobar}>
                Pasar lista
              </button>
            </div>
          ))}
        </div>
      )}

      {horarioActivo && (
        <div style={styles.card}>
          <div style={styles.horarioActivoHeader}>
            <div>
              <p style={styles.cardTitulo}>
                {horarioActivo.hora_inicio} - {horarioActivo.hora_fin}
              </p>

              <p style={styles.cardSub}>
                {horariosDelDia.find(
                  h => h.horario_id === horarioActivo.horario_id
                )?.reservados} reservados
              </p>
            </div>

            <div style={styles.horarioActivoBotones}>
              <button
                style={styles.btnEditar}
                onClick={() => {
                  setHorarioActivo(null);
                  setListaAsistencia([]);
                }}
              >
                ← Volver
              </button>

              <button
                style={styles.btnAprobar}
                onClick={marcarTodos}
              >
                ✓ Todos asistieron
              </button>
            </div>
          </div>

          {listaAsistencia.map(r => (
            <div key={r.reserva_id} style={styles.personaRow}>
              <div style={styles.cardIcono}>
                {r.nombre?.charAt(0).toUpperCase()}
              </div>

              <div style={{ flex: 1 }}>
                <p style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--text-principal)'
                }}>
                  {r.nombre} {r.apellido}
                </p>
              </div>

              {r.asistio === null || r.asistio === undefined ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    style={styles.btnAprobarPeq}
                    onClick={() =>
                      marcarAsistencia(
                        r.reserva_id,
                        r.usuario_id,
                        true
                      )
                    }
                  >
                    Asistió
                  </button>

                  <button
                    style={styles.btnRechazarPeq}
                    onClick={() =>
                      marcarAsistencia(
                        r.reserva_id,
                        r.usuario_id,
                        false
                      )
                    }
                  >
                    Falta
                  </button>
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <span style={{
                    ...styles.badge,
                    background: r.asistio
                      ? 'rgba(16, 185, 129, 0.1)'
                      : 'rgba(239, 68, 68, 0.1)',
                    color: r.asistio
                      ? 'var(--color-exito)'
                      : 'var(--color-error)',
                    borderColor: r.asistio
                      ? 'rgba(16, 185, 129, 0.2)'
                      : 'rgba(239, 68, 68, 0.2)'
                  }}>
                    {r.asistio ? '✓ Asistió' : '✕ Falta'}
                  </span>

                  <button
                    style={styles.btnEditar}
                    onClick={() =>
                      marcarAsistencia(
                        r.reserva_id,
                        r.usuario_id,
                        !r.asistio
                      )
                    }
                  >
                    Cambiar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {horariosDelDia.length === 0 &&
        !horarioActivo &&
        fechaAsistencia && (
          <div style={styles.vacio}>
            <div style={styles.vacioIcon}>📅</div>
            <p style={styles.vacioTexto}>
              No hay reservas para esta fecha
            </p>
          </div>
        )}

      <div style={styles.card}>
        <div style={styles.cardHeaderRow}>
          <p style={styles.cardTitulo}>💳 Saldos pendientes</p>

          <button
            style={styles.btnEditar}
            onClick={cargarSaldos}
          >
            ↻ Actualizar
          </button>
        </div>

        <div style={styles.searchBoxAdmin}>
          <span style={{ fontSize: 16, opacity: 0.6 }}>🔍</span>

          <input
            style={styles.searchInputAdmin}
            placeholder="Buscar por nombre o apellido..."
            value={busquedaSaldos}
            onChange={e => setBusquedaSaldos(e.target.value)}
          />

          {busquedaSaldos && (
            <button
              style={styles.clearBtnAdmin}
              onClick={() => setBusquedaSaldos('')}
            >
              ✕
            </button>
          )}
        </div>

        {conSaldo.length === 0 ? (
          <div style={styles.exitoBox}>
            <span>✓</span>
            <span>Ningún usuario tiene saldo pendiente</span>
          </div>
        ) : filtrados.length === 0 ? (
          <p style={styles.vacioTextoCentrado}>
            No se encontró a nadie con ese nombre
          </p>
        ) : (
          filtrados.map(s => (
            <div key={s.usuario_id} style={styles.saldoCard}>
              <div style={styles.saldoCardHeader}>
                <div>
                  <p style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'var(--text-principal)'
                  }}>
                    {s.nombre} {s.apellido}
                  </p>

                  <p style={{
                    fontSize: 12,
                    color: 'var(--text-secundario)',
                    marginTop: 2
                  }}>
                    {s.total_faltas} falta{s.total_faltas !== 1 ? 's' : ''} ·
                    Debe:{' '}
                    <strong style={{ color: 'var(--color-error)' }}>
                      ${parseFloat(s.saldo_pendiente).toFixed(2)}
                    </strong>
                  </p>
                </div>

                <button
                  style={styles.btnAprobar}
                  onClick={() =>
                    registrarPagoLibre(
                      s.usuario_id,
                      s.saldo_pendiente
                    )
                  }
                >
                  Pago total
                </button>
              </div>

              <div style={styles.pagoParcialRow}>
                <input
                  style={{ ...styles.inputSmall, maxWidth: 130 }}
                  type="number"
                  inputMode="decimal"
                  placeholder="Monto $"
                  min="0.01"
                  step="0.01"
                  value={pagoForm[s.usuario_id] || ''}
                  onChange={e =>
                    setPagoForm({
                      ...pagoForm,
                      [s.usuario_id]: e.target.value
                    })
                  }
                />

                <button
                  style={{
                    ...styles.btnAgregar,
                    padding: '8px 12px',
                    fontSize: 12
                  }}
                  onClick={() =>
                    registrarPagoLibre(
                      s.usuario_id,
                      pagoForm[s.usuario_id]
                    )
                  }
                >
                  Pago parcial
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminAsistencias;