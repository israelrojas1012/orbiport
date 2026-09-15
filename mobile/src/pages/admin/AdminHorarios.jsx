import { useEffect, useState } from 'react';
import API from '../../services/api';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const TIPOS_CANCHA = ['5vs5', '6vs6', '7vs7', '8vs8', '9vs9', '10vs10', '11vs11'];

const HORARIO_VACIO = {
  hora_inicio: '',
  hora_fin: '',
  cupos: '',
  tipo_cancha: ''
};

const ESPECIAL_VACIO = {
  hora_inicio: '',
  hora_fin: '',
  cupos: ''
};

const formatHora = hora => {
  if (!hora) return '';
  const [h, m] = hora.slice(0, 5).split(':');
  const hNum = parseInt(h);
  return `${hNum % 12 || 12}:${m} ${hNum >= 12 ? 'PM' : 'AM'}`;
};

const fechaProxima = dia => {
  const jsDias = ['Domingo', ...DIAS];
  const hoy = new Date();
  let diff = jsDias.indexOf(dia) - hoy.getDay();
  if (diff < 0) diff += 7;

  const fecha = new Date(hoy);
  fecha.setDate(hoy.getDate() + diff);

  const yy = fecha.getFullYear();
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const dd = String(fecha.getDate()).padStart(2, '0');

  return `${yy}-${mm}-${dd}`;
};

const fechaLarga = fecha => {
  const f = new Date(String(fecha).slice(0, 10) + 'T00:00:00');
  return isNaN(f.getTime())
    ? String(fecha).slice(0, 10)
    : f.toLocaleDateString('es-EC', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
};

const CampoHora = ({ value, onChange, styles }) => (
  <input
    style={styles.inputSmall}
    type="time"
    value={value}
    onChange={e => onChange(e.target.value)}
  />
);

const CampoCupos = ({ value, onChange, placeholder, styles }) => (
  <input
    style={styles.inputSmall}
    type="number"
    inputMode="numeric"
    min="1"
    placeholder={placeholder}
    value={value}
    onChange={e => {
      const val = parseInt(e.target.value);
      if (e.target.value === '') onChange('');
      else if (!isNaN(val) && val >= 1) onChange(val);
    }}
  />
);

const TipoCancha = ({ value, onChange, styles }) => (
  <select style={styles.inputSmall} value={value || ''} onChange={e => onChange(e.target.value)}>
    <option value="">Tipo</option>
    {TIPOS_CANCHA.map(tipo => (
      <option key={tipo} value={tipo}>
        {tipo.replace('vs', ' vs ')}
      </option>
    ))}
  </select>
);

export default function AdminHorarios({
  lugar,
  mostrarMensaje,
  styles,
  onVerInscritos
}) {
  const [horarios, setHorarios] = useState([]);
  const [excepciones, setExcepciones] = useState([]);
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);
  const [nuevoHorario, setNuevoHorario] = useState(HORARIO_VACIO);
  const [horarioEditando, setHorarioEditando] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [copiandoDia, setCopiandoDia] = useState(null);
  const [horariosSeleccionados, setHorariosSeleccionados] = useState([]);
  const [diasCopia, setDiasCopia] = useState([]);
  const [mensajeCopia, setMensajeCopia] = useState('');
  const [modalEspecial, setModalEspecial] = useState(false);
  const [fechaEspecial, setFechaEspecial] = useState('');
  const [tipoEspecial, setTipoEspecial] = useState('');
  const [motivoEspecial, setMotivoEspecial] = useState('');
  const [horariosEspeciales, setHorariosEspeciales] = useState([ESPECIAL_VACIO]);
  const [mensajeEspecial, setMensajeEspecial] = useState('');
  const [horarioEspecialEditando, setHorarioEspecialEditando] = useState(null);
  const [editFormEspecial, setEditFormEspecial] = useState({});

  useEffect(() => {
    if (!lugar?.id) return;

    Promise.all([
      API.get(`/admin/horarios/${lugar.id}`),
      API.get(`/admin/excepciones/${lugar.id}`)
    ]).then(([h, e]) => {
      setHorarios(h.data);
      setExcepciones(e.data);
    }).catch(() => {});
  }, [lugar?.id]);

  const cargarHorarios = () =>
    API.get(`/admin/horarios/${lugar.id}`)
      .then(res => setHorarios(res.data))
      .catch(() => {});

  const cargarExcepciones = () =>
    API.get(`/admin/excepciones/${lugar.id}`)
      .then(res => setExcepciones(res.data))
      .catch(() => {});

  const horariosPorDia = dia =>
    horarios.filter(h => h.dia === dia && h.activo);

  const excepcionesPorFecha = excepciones.reduce((acc, e) => {
    const fecha = String(e.fecha).slice(0, 10);
    if (!acc[fecha]) {
      acc[fecha] = { cerrado: e.cerrado, motivo: e.motivo, horarios: [] };
    }
    if (!e.cerrado) acc[fecha].horarios.push(e);
    return acc;
  }, {});

  const agregarHorario = async () => {
    if (!nuevoHorario.hora_inicio || !nuevoHorario.hora_fin || !nuevoHorario.cupos) {
      return mostrarMensaje('Completa todos los campos');
    }

    if (lugar.categoria === 'canchas' && !nuevoHorario.tipo_cancha) {
      return mostrarMensaje('Selecciona el tipo de cancha');
    }

    try {
      await API.post('/admin/horarios', {
        lugar_id: lugar.id,
        dia: diaSeleccionado,
        ...nuevoHorario
      });
      await cargarHorarios();
      setNuevoHorario(HORARIO_VACIO);
      mostrarMensaje('Horario agregado');
    } catch (err) {
      mostrarMensaje(err.response?.data?.error || 'Error al agregar');
    }
  };

  const guardarEdicion = async () => {
    try {
      await API.put(`/admin/horarios/${horarioEditando.id}`, {
        ...editForm,
        dia: horarioEditando.dia,
        activo: true
      });
      await cargarHorarios();
      setHorarioEditando(null);
      mostrarMensaje('Horario editado');
    } catch (err) {
      mostrarMensaje(err.response?.data?.error || 'Error al editar');
    }
  };

  const eliminarHorario = async id => {
    try {
      await API.delete(`/admin/horarios/${id}`);
      await cargarHorarios();
      mostrarMensaje('Horario eliminado');
    } catch (err) {
      mostrarMensaje(err.response?.data?.error || 'Error al eliminar');
    }
  };

  const copiarHorarios = async () => {
    if (!diasCopia.length) return setMensajeCopia('Selecciona al menos un día destino');
    if (!horariosSeleccionados.length) return setMensajeCopia('Selecciona al menos un horario');

    try {
      const res = await API.post('/admin/horarios/copiar', {
        lugar_id: lugar.id,
        horarios_ids: horariosSeleccionados,
        dias_destino: diasCopia
      });

      await cargarHorarios();
      setCopiandoDia(null);
      setDiasCopia([]);
      setHorariosSeleccionados([]);
      setMensajeCopia('');

      mostrarMensaje(
        res.data.errores?.length
          ? 'Algunos horarios no se copiaron por conflictos'
          : 'Horarios copiados correctamente'
      );
    } catch (err) {
      setMensajeCopia(err.response?.data?.error || 'Error al copiar');
    }
  };

  const abrirModalEspecial = () => {
    setModalEspecial(true);
    setFechaEspecial('');
    setTipoEspecial('');
    setMotivoEspecial('');
    setHorariosEspeciales([ESPECIAL_VACIO]);
    setMensajeEspecial('');
  };

  const cerrarModalEspecial = () => {
    setModalEspecial(false);
    setFechaEspecial('');
    setTipoEspecial('');
    setMotivoEspecial('');
    setHorariosEspeciales([ESPECIAL_VACIO]);
    setMensajeEspecial('');
  };

  const guardarExcepcion = async () => {
    if (!fechaEspecial) return setMensajeEspecial('Selecciona una fecha');
    if (!tipoEspecial) return setMensajeEspecial('Selecciona cerrado u horario diferente');

    if (
      tipoEspecial === 'horario' &&
      horariosEspeciales.some(h => !h.hora_inicio || !h.hora_fin || !h.cupos)
    ) {
      return setMensajeEspecial('Completa todos los campos de los horarios');
    }

    try {
      await API.post('/admin/excepciones', {
        lugar_id: lugar.id,
        fecha: fechaEspecial,
        cerrado: tipoEspecial === 'cerrado',
        horarios: tipoEspecial === 'horario' ? horariosEspeciales : [],
        motivo: motivoEspecial
      });

      await cargarExcepciones();
      cerrarModalEspecial();
      mostrarMensaje('Día especial guardado correctamente');
    } catch (err) {
      setMensajeEspecial(err.response?.data?.error || 'Error al guardar');
    }
  };

  const guardarEdicionEspecial = async () => {
    if (editFormEspecial.hora_fin <= editFormEspecial.hora_inicio) {
      return mostrarMensaje('La hora de fin debe ser mayor que la hora de inicio');
    }

    try {
      await API.put(`/admin/excepcion/${horarioEspecialEditando.id}`, editFormEspecial);
      await cargarExcepciones();
      setHorarioEspecialEditando(null);
      mostrarMensaje('Horario especial actualizado');
    } catch (err) {
      mostrarMensaje(err.response?.data?.error || 'Error al actualizar');
    }
  };

  const eliminarHorarioEspecial = async id => {
    try {
      await API.delete(`/admin/excepcion/${id}`);
      await cargarExcepciones();
      mostrarMensaje('Horario especial eliminado');
    } catch (err) {
      mostrarMensaje(err.response?.data?.error || 'Error al eliminar horario especial');
    }
  };

  const eliminarExcepcion = async fecha => {
    try {
      await API.delete(`/admin/excepciones/${lugar.id}/${String(fecha).slice(0, 10)}`);
      await cargarExcepciones();
      mostrarMensaje('Día especial eliminado');
    } catch {
      mostrarMensaje('Error al eliminar');
    }
  };

  const agregarHorarioEspecial = () =>
    setHorariosEspeciales(prev => [...prev, ESPECIAL_VACIO]);

  const quitarHorarioEspecial = i =>
    setHorariosEspeciales(prev => prev.filter((_, idx) => idx !== i));

  const actualizarHorarioEspecial = (i, campo, valor) =>
    setHorariosEspeciales(prev =>
      prev.map((h, idx) => idx === i ? { ...h, [campo]: valor } : h)
    );

  const iniciarEdicion = h => {
    setHorarioEditando(h);
    setEditForm({
      hora_inicio: h.hora_inicio.slice(0, 5),
      hora_fin: h.hora_fin.slice(0, 5),
      cupos: h.cupos,
      tipo_cancha: h.tipo_cancha || ''
    });
  };

  const iniciarEdicionEspecial = h => {
    setHorarioEspecialEditando(h);
    setEditFormEspecial({
      hora_inicio: h.hora_inicio.slice(0, 5),
      hora_fin: h.hora_fin.slice(0, 5),
      cupos: h.cupos
    });
  };

  const toggleHorario = id =>
    setHorariosSeleccionados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );

  const cancelarCopia = () => {
    setCopiandoDia(null);
    setDiasCopia([]);
    setHorariosSeleccionados([]);
    setMensajeCopia('');
  };

  return (
    <div>
      <button style={styles.btnEspecial} onClick={abrirModalEspecial}>
        ⚡ Gestionar día especial
      </button>

      {Object.entries(excepcionesPorFecha).map(([fecha, datos]) => (
        <div key={fecha} style={{
          ...styles.excepcionCard,
          background: datos.cerrado ? 'rgba(239,68,68,.1)' : 'rgba(245,158,11,.1)',
          borderColor: datos.cerrado ? 'rgba(239,68,68,.2)' : 'rgba(245,158,11,.2)'
        }}>
          <div style={styles.excepcionHeader}>
            <p style={styles.excepcionFecha}>{fechaLarga(fecha)}</p>
            <button
              style={styles.btnEliminarHorario}
              onClick={() => eliminarExcepcion(fecha)}
            >
              Eliminar día
            </button>
          </div>

          {datos.motivo && (
            <p style={styles.excepcionMotivo}>📌 {datos.motivo}</p>
          )}

          {datos.cerrado ? (
            <p style={{ fontSize: 12, color: 'var(--color-error)', fontWeight: 700 }}>
              🔴 Cerrado
            </p>
          ) : datos.horarios.map(h => (
            <div key={h.id} style={styles.horarioRowConBoton}>
              <div style={{
                ...styles.horarioRow,
                borderLeft: '3px solid var(--color-advertencia)'
              }}>
                {horarioEspecialEditando?.id === h.id ? (
                  <>
                    <CampoHora
                      value={editFormEspecial.hora_inicio}
                      onChange={v => setEditFormEspecial({ ...editFormEspecial, hora_inicio: v })}
                      styles={styles}
                    />
                    <CampoHora
                      value={editFormEspecial.hora_fin}
                      onChange={v => setEditFormEspecial({ ...editFormEspecial, hora_fin: v })}
                      styles={styles}
                    />
                    <CampoCupos
                      value={editFormEspecial.cupos}
                      onChange={v => setEditFormEspecial({ ...editFormEspecial, cupos: v })}
                      placeholder="Cupos"
                      styles={styles}
                    />
                    <button style={styles.btnGuardarSmall} onClick={guardarEdicionEspecial}>OK</button>
                    <button style={styles.btnCancelarSmall} onClick={() => setHorarioEspecialEditando(null)}>X</button>
                  </>
                ) : (
                  <>
                    <span style={{ ...styles.horarioTexto, color: 'var(--color-advertencia)' }}>
                      {formatHora(h.hora_inicio)} - {formatHora(h.hora_fin)}
                    </span>
                    <span style={styles.cuposTexto}>👥 {h.cupos} cupos</span>
                    <button style={styles.btnEditarHorario} onClick={() => iniciarEdicionEspecial(h)}>Editar</button>
                    <button style={styles.btnEliminarHorario} onClick={() => eliminarHorarioEspecial(h.id)}>Eliminar</button>
                  </>
                )}
              </div>

              {!horarioEspecialEditando && (
                <button
                  style={{
                    ...styles.btnVerInscritos,
                    borderColor: 'rgba(245,158,11,.4)',
                    color: 'var(--color-advertencia)',
                    background: 'rgba(245,158,11,.08)'
                  }}
                  onClick={() => onVerInscritos(h, fecha.slice(0, 10))}
                >
                  👥 Ver inscritos
                </button>
              )}
            </div>
          ))}
        </div>
      ))}

      <p style={styles.hint}>Toca un día para gestionar sus horarios normales.</p>

      {copiandoDia && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <p style={styles.cardTitulo}>Copiar horarios de {copiandoDia}</p>
            <p style={styles.cardSub}>Selecciona los horarios a copiar:</p>

            <div style={styles.checkboxLista}>
              {horariosPorDia(copiandoDia).map(h => (
                <label key={h.id} style={{
                  ...styles.checkboxItem,
                  background: horariosSeleccionados.includes(h.id)
                    ? 'var(--color-primario-suave)'
                    : 'var(--bg-hover)',
                  borderColor: horariosSeleccionados.includes(h.id)
                    ? 'var(--color-primario-borde)'
                    : 'var(--border-suave)'
                }}>
                  <input
                    type="checkbox"
                    checked={horariosSeleccionados.includes(h.id)}
                    onChange={() => toggleHorario(h.id)}
                  />
                  <span style={{ fontWeight: 700, color: 'var(--color-primario)' }}>
                    {formatHora(h.hora_inicio)} - {formatHora(h.hora_fin)}
                  </span>
                  <span style={{ color: 'var(--text-secundario)' }}>
                    · {h.cupos} cupos
                  </span>
                </label>
              ))}
            </div>

            <p style={styles.cardSub}>Copiar a estos días:</p>

            <div style={styles.diasGrid}>
              {DIAS.filter(d => d !== copiandoDia).map(d => (
                <button
                  key={d}
                  onClick={() => setDiasCopia(prev =>
                    prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
                  )}
                  style={{
                    ...styles.diaBadge,
                    background: diasCopia.includes(d)
                      ? 'var(--color-primario)'
                      : 'var(--bg-hover)',
                    color: diasCopia.includes(d)
                      ? '#fff'
                      : 'var(--text-secundario)',
                    borderColor: diasCopia.includes(d)
                      ? 'var(--color-primario)'
                      : 'var(--border-suave)'
                  }}
                >
                  {d}
                </button>
              ))}
            </div>

            {mensajeCopia && <p style={styles.errorTexto}>{mensajeCopia}</p>}

            <div style={styles.botonesRow}>
              <button style={styles.btnGuardar} onClick={copiarHorarios}>Copiar</button>
              <button style={styles.btnCancelar} onClick={cancelarCopia}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {DIAS.map(dia => {
        const fecha = fechaProxima(dia);
        const excepcion = excepcionesPorFecha[fecha];
        const lista = horariosPorDia(dia);

        return (
          <div key={dia} style={styles.diaCard}>
            <div
              style={styles.diaHeader}
              onClick={() => setDiaSeleccionado(diaSeleccionado === dia ? null : dia)}
            >
              <div style={styles.diaNombreWrap}>
                <span style={styles.diaNombre}>{dia}</span>
                <span style={styles.diaFecha}>
                  {new Date(fecha + 'T00:00:00').toLocaleDateString('es-EC', {
                    day: 'numeric',
                    month: 'short'
                  })}
                </span>

                {excepcion && (
                  <span style={{
                    fontSize: 10,
                    color: excepcion.cerrado
                      ? 'var(--color-error)'
                      : 'var(--color-advertencia)',
                    fontWeight: 700,
                    marginTop: 2
                  }}>
                    {excepcion.cerrado ? '🔴 CERRADO' : '⚡ ESPECIAL'}
                  </span>
                )}
              </div>

              <div style={styles.horariosResumen}>
                {!lista.length
                  ? <span style={styles.cerradoBadge}>Sin horarios</span>
                  : lista.map(h => (
                    <span key={h.id} style={styles.horarioBadge}>
                      {formatHora(h.hora_inicio)}-{formatHora(h.hora_fin)}
                    </span>
                  ))}
              </div>

              <span style={styles.chevron}>
                {diaSeleccionado === dia ? '▲' : '▼'}
              </span>
            </div>

            {diaSeleccionado === dia && (
              <div style={styles.diaDetalle}>
                {excepcion && (
                  <div style={{
                    ...styles.motivoBox,
                    background: excepcion.cerrado
                      ? 'rgba(239,68,68,.1)'
                      : 'rgba(245,158,11,.1)',
                    color: excepcion.cerrado
                      ? 'var(--color-error)'
                      : 'var(--color-advertencia)'
                  }}>
                    {excepcion.cerrado
                      ? '🔒 Cerrado este día (excepción)'
                      : '⚡ Este día tiene horarios especiales que reemplazan los normales'}
                  </div>
                )}

                {lista.map(h => (
                  <div key={h.id} style={styles.horarioRowConBoton}>
                    <div style={styles.horarioRow}>
                      {horarioEditando?.id === h.id ? (
                        <>
                          <CampoHora
                            value={editForm.hora_inicio}
                            onChange={v => setEditForm({ ...editForm, hora_inicio: v })}
                            styles={styles}
                          />
                          <CampoHora
                            value={editForm.hora_fin}
                            onChange={v => setEditForm({ ...editForm, hora_fin: v })}
                            styles={styles}
                          />
                          <CampoCupos
                            value={editForm.cupos}
                            onChange={v => setEditForm({ ...editForm, cupos: v })}
                            placeholder={lugar.categoria === 'canchas' ? 'Cant.' : 'Cupos'}
                            styles={styles}
                          />

                          {lugar.categoria === 'canchas' && (
                            <TipoCancha
                              value={editForm.tipo_cancha}
                              onChange={v => setEditForm({ ...editForm, tipo_cancha: v })}
                              styles={styles}
                            />
                          )}

                          <button style={styles.btnGuardarSmall} onClick={guardarEdicion}>OK</button>
                          <button style={styles.btnCancelarSmall} onClick={() => setHorarioEditando(null)}>X</button>
                        </>
                      ) : (
                        <>
                          <span style={styles.horarioTexto}>
                            {formatHora(h.hora_inicio)} - {formatHora(h.hora_fin)}
                          </span>
                          <span style={styles.cuposTexto}>
                            {lugar.categoria === 'canchas' ? '⚽' : '👥'} {h.cupos}{' '}
                            {lugar.categoria === 'canchas'
                              ? `cancha(s) ${h.tipo_cancha || ''}`
                              : 'cupos totales'}
                          </span>
                          <button style={styles.btnEditarHorario} onClick={() => iniciarEdicion(h)}>Editar</button>
                          <button style={styles.btnEliminarHorario} onClick={() => eliminarHorario(h.id)}>Eliminar</button>
                        </>
                      )}
                    </div>

                    {!horarioEditando && (
                      <button
                        style={styles.btnVerInscritos}
                        onClick={() => onVerInscritos(h, fecha)}
                      >
                        👥 Ver inscritos
                      </button>
                    )}
                  </div>
                ))}

                {lista.length > 0 && (
                  <button
                    style={styles.btnCopiar}
                    onClick={() => {
                      setCopiandoDia(dia);
                      setDiasCopia([]);
                      setHorariosSeleccionados([]);
                      setMensajeCopia('');
                    }}
                  >
                    📋 Copiar horarios de {dia} a otros días
                  </button>
                )}

                <div style={styles.agregarHorario}>
                  <p style={styles.agregarTitulo}>+ Agregar horario para {dia}</p>

                  <div style={styles.inputsRow}>
                    <CampoHora
                      value={nuevoHorario.hora_inicio}
                      onChange={v => setNuevoHorario({ ...nuevoHorario, hora_inicio: v })}
                      styles={styles}
                    />
                    <CampoHora
                      value={nuevoHorario.hora_fin}
                      onChange={v => setNuevoHorario({ ...nuevoHorario, hora_fin: v })}
                      styles={styles}
                    />
                    <CampoCupos
                      value={nuevoHorario.cupos}
                      onChange={v => setNuevoHorario({ ...nuevoHorario, cupos: v })}
                      placeholder={lugar.categoria === 'canchas' ? 'Cant. canchas' : 'Cupos'}
                      styles={styles}
                    />
                  </div>

                  {lugar.categoria === 'canchas' && (
                    <select
                      style={styles.input}
                      value={nuevoHorario.tipo_cancha}
                      onChange={e => setNuevoHorario({
                        ...nuevoHorario,
                        tipo_cancha: e.target.value
                      })}
                    >
                      <option value="">Tipo de cancha</option>
                      {TIPOS_CANCHA.map(tipo => (
                        <option key={tipo} value={tipo}>
                          {tipo.replace('vs', ' vs ')}
                        </option>
                      ))}
                    </select>
                  )}

                  <button style={styles.btnAgregar} onClick={agregarHorario}>
                    Agregar horario
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {modalEspecial && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <p style={styles.cardTitulo}>Gestionar día especial</p>
            <p style={styles.cardSub}>Solo afecta la fecha exacta que elijas</p>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Fecha</label>
              <input
                style={styles.input}
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={fechaEspecial}
                onChange={e => setFechaEspecial(e.target.value)}
              />
            </div>

            <div style={styles.tipoEspecialRow}>
              <button
                style={{
                  ...styles.diaBadge,
                  background: tipoEspecial === 'cerrado'
                    ? 'var(--color-error)'
                    : 'var(--bg-hover)',
                  color: tipoEspecial === 'cerrado'
                    ? '#fff'
                    : 'var(--text-secundario)'
                }}
                onClick={() => setTipoEspecial('cerrado')}
              >
                🔒 Cerrado ese día
              </button>

              <button
                style={{
                  ...styles.diaBadge,
                  background: tipoEspecial === 'horario'
                    ? 'var(--color-primario)'
                    : 'var(--bg-hover)',
                  color: tipoEspecial === 'horario'
                    ? '#fff'
                    : 'var(--text-secundario)'
                }}
                onClick={() => setTipoEspecial('horario')}
              >
                ⚡ Horario diferente
              </button>
            </div>

            {tipoEspecial === 'horario' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={styles.hint}>
                  Estos horarios reemplazan los normales solo en esta fecha:
                </p>

                {horariosEspeciales.map((h, i) => (
                  <div key={i} style={styles.horarioEspecialItem}>
                    <CampoHora
                      value={h.hora_inicio}
                      onChange={v => actualizarHorarioEspecial(i, 'hora_inicio', v)}
                      styles={styles}
                    />
                    <CampoHora
                      value={h.hora_fin}
                      onChange={v => actualizarHorarioEspecial(i, 'hora_fin', v)}
                      styles={styles}
                    />
                    <CampoCupos
                      value={h.cupos}
                      onChange={v => actualizarHorarioEspecial(i, 'cupos', v)}
                      placeholder="Cupos"
                      styles={styles}
                    />

                    {horariosEspeciales.length > 1 && (
                      <button
                        style={styles.btnCancelarSmall}
                        onClick={() => quitarHorarioEspecial(i)}
                      >
                        X
                      </button>
                    )}
                  </div>
                ))}

                <button style={styles.btnCopiar} onClick={agregarHorarioEspecial}>
                  + Agregar otro horario
                </button>
              </div>
            )}

            <input
              style={styles.input}
              placeholder="Motivo (ej: Feriado nacional)"
              value={motivoEspecial}
              onChange={e => setMotivoEspecial(e.target.value)}
            />

            {mensajeEspecial && (
              <p style={styles.errorTexto}>{mensajeEspecial}</p>
            )}

            <div style={styles.botonesRow}>
              <button style={styles.btnGuardar} onClick={guardarExcepcion}>
                Guardar
              </button>
              <button style={styles.btnCancelar} onClick={cerrarModalEspecial}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}