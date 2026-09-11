import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useTheme } from '../context/ThemeContext';
import TerminosModal from '../components/TerminosModal';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DIAS_JS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const formatHora = (hora) => {
  if (!hora) return '';
  const [h, m] = hora.slice(0, 5).split(':');
  const hNum = parseInt(h);
  const ampm = hNum >= 12 ? 'PM' : 'AM';
  const h12 = hNum % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};

const getFechaDelDia = (dia) => {
  const hoy = new Date();
  const diaActual = hoy.getDay();
  const diaObjetivo = DIAS_JS.indexOf(dia);
  let diff = diaObjetivo - diaActual;
  if (diff < 0) diff += 7;
  const fecha = new Date(hoy);
  fecha.setDate(hoy.getDate() + diff);
  return fecha.toLocaleDateString('es-EC', { day: 'numeric', month: 'short' });
};

const formatFechaLarga = (fechaStr) => {
  if (!fechaStr) return '';
  const soloFecha = String(fechaStr).slice(0, 10);
  const f = new Date(soloFecha + 'T00:00:00');
  if (isNaN(f.getTime())) return soloFecha;
  return f.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' });
};

export default function AdminPanel() {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const [lugar, setLugar] = useState(null);
  const [inscripciones, setInscripciones] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [tab, setTab] = useState('info');
  const [editando, setEditando] = useState(false);
  const [infoForm, setInfoForm] = useState({});
  const [mensaje, setMensaje] = useState('');
  const [mensajeCopia, setMensajeCopia] = useState('');
  const [fechaAsistencia, setFechaAsistencia] = useState(() => {
    const hoy = new Date();
    const yy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  });
  const [listaAsistencia, setListaAsistencia] = useState([]);
  const [saldos, setSaldos] = useState([]);
  const [pagoForm, setPagoForm] = useState({});
  const [busquedaInscritos, setBusquedaInscritos] = useState('');
  const [busquedaSaldos, setBusquedaSaldos] = useState('');
  const [fotos, setFotos] = useState([]);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [fotoIndexAdmin, setFotoIndexAdmin] = useState(0);
  const [fotoAmpliadaAdmin, setFotoAmpliadaAdmin] = useState(null);
  const [mensajeAsistencia, setMensajeAsistencia] = useState('');
  const [horariosDelDia, setHorariosDelDia] = useState([]);
  const [horarioActivo, setHorarioActivo] = useState(null);
  const [nuevoHorario, setNuevoHorario] = useState({ hora_inicio: '', hora_fin: '', cupos: '', tipo_cancha: '' });
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);
  const [horarioEditando, setHorarioEditando] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [copiandoDia, setCopiandoDia] = useState(null);
  const [horariosSeleccionados, setHorariosSeleccionados] = useState([]);
  const [diasCopia, setDiasCopia] = useState([]);
  const [confirmarEliminar, setConfirmarEliminar] = useState(null);
  const [modalEspecial, setModalEspecial] = useState(false);
  const [fechaEspecial, setFechaEspecial] = useState('');
  const [tipoEspecial, setTipoEspecial] = useState('');
  const [motivoEspecial, setMotivoEspecial] = useState('');
  const [horariosEspeciales, setHorariosEspeciales] = useState([{ hora_inicio: '', hora_fin: '', cupos: '' }]);
  const [excepciones, setExcepciones] = useState([]);
  const [mensajeEspecial, setMensajeEspecial] = useState('');
  const [perfilForm, setPerfilForm] = useState({ nombre: usuario.nombre || '', apellido: usuario.apellido || '' });
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [passFormAdmin, setPassFormAdmin] = useState({ actual: '', nueva: '', confirmar: '' });
  const [editandoPassAdmin, setEditandoPassAdmin] = useState(false);
  const { tema, cambiarTema } = useTheme();
  const [modalTerminosAdmin, setModalTerminosAdmin] = useState(false);
  const [forzarTerminos, setForzarTerminos] = useState(false);
  const [modalInscritos, setModalInscritos] = useState(null);
  const [personasInscritas, setPersonasInscritas] = useState([]);
  const [fechaInscritos, setFechaInscritos] = useState('');
  // NUEVO: estados para editar horarios especiales individuales
  const [horarioEspecialEditando, setHorarioEspecialEditando] = useState(null);
  const [editFormEspecial, setEditFormEspecial] = useState({});

  useEffect(() => {
    if (usuario.acepto_terminos === false) {
      setModalTerminosAdmin(true);
      setForzarTerminos(true);
    }
  }, []);

  const aceptarTerminosAdmin = async () => {
    try {
      await API.put(`/usuarios/${usuario.id}/aceptar-terminos`);
      const actualizado = { ...usuario, acepto_terminos: true };
      localStorage.setItem('usuario', JSON.stringify(actualizado));
      setModalTerminosAdmin(false);
      setForzarTerminos(false);
      mostrarMensaje('Terminos aceptados correctamente');
    } catch (err) {
      mostrarMensaje('Error al aceptar terminos');
    }
  };

  const rechazarTerminosAdmin = () => {
    localStorage.clear();
    navigate('/');
  };

  const verInscritosAdmin = async (horario, fecha) => {
    try {
      const res = await API.get(`/asistencia/personas/${horario.id}/${fecha}`);
      setPersonasInscritas(res.data);
      setModalInscritos({ horario, fecha });
    } catch (err) {
      mostrarMensaje('Error al cargar inscritos');
    }
  };

  const obtenerFechaProxima = (dia) => {
    const hoy = new Date();
    const diaActual = hoy.getDay();
    const diaObjetivo = DIAS_JS.indexOf(dia);
    let diff = diaObjetivo - diaActual;
    if (diff < 0) diff += 7;
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() + diff);
    const yy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  };

  const cambiarFechaInscritos = async (nuevaFecha) => {
    if (!modalInscritos) return;
    setFechaInscritos(nuevaFecha);
    try {
      const res = await API.get(`/asistencia/personas/${modalInscritos.horario.id}/${nuevaFecha}`);
      setPersonasInscritas(res.data);
      setModalInscritos({ ...modalInscritos, fecha: nuevaFecha });
    } catch (err) {
      mostrarMensaje('Error al cargar inscritos');
    }
  };

useEffect(() => {
  console.log('ADMIN ID:', usuario.id);

  API.get(`/admin/lugar/${usuario.id}`).then(res => {
    console.log('ID DEL LUGAR:', res.data.id);
    console.log('NOMBRE DEL LUGAR:', res.data.nombre);

    setLugar(res.data);
    setInfoForm(res.data);
    cargarHorarios(res.data.id);
    cargarInscripciones(res.data.id);
    cargarFotos(res.data.id);
    cargarExcepciones(res.data.id);
    cargarSaldosAuto(res.data.id);
  }).catch(() => {});
}, []);

  const cargarHorarios = (lugar_id) => API.get(`/admin/horarios/${lugar_id}`).then(res => setHorarios(res.data)).catch(() => {});
  const cargarInscripciones = (lugar_id) => API.get(`/admin/inscripciones/${lugar_id}`).then(res => setInscripciones(res.data)).catch(() => {});
  const cargarExcepciones = (lugar_id) => API.get(`/admin/excepciones/${lugar_id}`).then(res => setExcepciones(res.data)).catch(() => {});

  const mostrarMensaje = (msg) => {
    setMensaje(msg);
    setTimeout(() => setMensaje(''), 4000);
  };

  const guardarInfo = async () => {
    try {
      await API.put(`/admin/lugar/${lugar.id}`, infoForm);
      setLugar(infoForm);
      setEditando(false);
      mostrarMensaje('Información actualizada');
    } catch (err) {
      mostrarMensaje('Error al actualizar');
    }
  };

  const aprobarInscripcion = async (id) => {
    await API.put(`/admin/inscripciones/${id}`, { estado: 'aprobada' });
    setInscripciones(inscripciones.map(i => i.id === id ? { ...i, estado: 'aprobada' } : i));
  };

  const rechazarInscripcion = async (id) => {
    await API.put(`/admin/inscripciones/${id}`, { estado: 'rechazada' });
    setInscripciones(inscripciones.map(i => i.id === id ? { ...i, estado: 'rechazada' } : i));
  };

  const eliminarInscripcion = async (id) => {
    try {
      await API.delete(`/admin/inscripciones/${id}`);
      setInscripciones(prev => prev.filter(x => x.id !== id));
      setConfirmarEliminar(null);
      mostrarMensaje('Inscripción eliminada');
    } catch (err) {
      mostrarMensaje('Error al eliminar');
    }
  };

  const agregarHorario = async () => {
    if (!nuevoHorario.hora_inicio || !nuevoHorario.hora_fin || !nuevoHorario.cupos) {
      mostrarMensaje('Completa todos los campos');
      return;
    }
    if (lugar.categoria === 'canchas' && !nuevoHorario.tipo_cancha) {
      mostrarMensaje('Selecciona el tipo de cancha');
      return;
    }
    try {
      await API.post('/admin/horarios', { lugar_id: lugar.id, dia: diaSeleccionado, ...nuevoHorario });
      cargarHorarios(lugar.id);
      setNuevoHorario({ hora_inicio: '', hora_fin: '', cupos: '', tipo_cancha: '' });
      mostrarMensaje('Horario agregado');
    } catch (err) {
      mostrarMensaje(err.response?.data?.error || 'Error al agregar');
    }
  };

  const guardarEdicion = async () => {
    try {
      await API.put(`/admin/horarios/${horarioEditando.id}`, { ...editForm, dia: horarioEditando.dia, activo: true });
      cargarHorarios(lugar.id);
      setHorarioEditando(null);
      mostrarMensaje('Horario editado');
    } catch (err) {
      mostrarMensaje(err.response?.data?.error || 'Error al editar');
    }
  };

  // NUEVO: guardar edición de un horario especial individual
  const guardarEdicionEspecial = async () => {
    if (editFormEspecial.hora_fin <= editFormEspecial.hora_inicio) {
      mostrarMensaje('La hora de fin debe ser mayor que la hora de inicio');
      return;
    }
    try {
      await API.put(`/admin/excepcion/${horarioEspecialEditando.id}`, editFormEspecial);
      cargarExcepciones(lugar.id);
      setHorarioEspecialEditando(null);
      mostrarMensaje('Horario especial actualizado');
    } catch (err) {
      mostrarMensaje(err.response?.data?.error || 'Error al actualizar');
    }
  };

  // NUEVO: eliminar un horario especial individual (sin borrar los otros del mismo día)
  const eliminarHorarioEspecialIndividual = async (id) => {
    try {
      await API.delete(`/admin/excepcion/${id}`);
      cargarExcepciones(lugar.id);
      mostrarMensaje('Horario especial eliminado');
    } catch (err) {
      mostrarMensaje(err.response?.data?.error || 'Error al eliminar horario especial');
    }
  };

  const eliminarHorario = async (id) => {
    try {
      await API.delete(`/admin/horarios/${id}`);
      cargarHorarios(lugar.id);
      mostrarMensaje('Horario eliminado');
    } catch (err) {
      mostrarMensaje(err.response?.data?.error || 'Error al eliminar');
    }
  };

  const copiarHorarios = async () => {
    if (diasCopia.length === 0) return setMensajeCopia('Selecciona al menos un día destino');
    if (horariosSeleccionados.length === 0) return setMensajeCopia('Selecciona al menos un horario');
    try {
      const res = await API.post('/admin/horarios/copiar', {
        lugar_id: lugar.id,
        horarios_ids: horariosSeleccionados,
        dias_destino: diasCopia
      });
      cargarHorarios(lugar.id);
      setCopiandoDia(null);
      setDiasCopia([]);
      setHorariosSeleccionados([]);
      setMensajeCopia('');
      if (res.data.errores && res.data.errores.length > 0) {
        mostrarMensaje('Algunos horarios no se copiaron por conflictos');
      } else {
        mostrarMensaje('Horarios copiados correctamente');
      }
    } catch (err) {
      setMensajeCopia(err.response?.data?.error || 'Error al copiar');
    }
  };

  const abrirModalEspecial = () => {
    setModalEspecial(true);
    setFechaEspecial('');
    setTipoEspecial('');
    setMotivoEspecial('');
    setHorariosEspeciales([{ hora_inicio: '', hora_fin: '', cupos: '' }]);
    setMensajeEspecial('');
  };

  const cerrarModalEspecial = () => {
    setModalEspecial(false);
    setFechaEspecial('');
    setTipoEspecial('');
    setMotivoEspecial('');
    setHorariosEspeciales([{ hora_inicio: '', hora_fin: '', cupos: '' }]);
    setMensajeEspecial('');
  };

  const agregarHorarioEspecial = () => setHorariosEspeciales(prev => [...prev, { hora_inicio: '', hora_fin: '', cupos: '' }]);
  const quitarHorarioEspecial = (i) => setHorariosEspeciales(prev => prev.filter((_, idx) => idx !== i));
  const actualizarHorarioEspecial = (i, campo, valor) => setHorariosEspeciales(prev => prev.map((h, idx) => idx === i ? { ...h, [campo]: valor } : h));

  const guardarExcepcion = async () => {
    if (!fechaEspecial) return setMensajeEspecial('Selecciona una fecha');
    if (!tipoEspecial) return setMensajeEspecial('Selecciona cerrado u horario diferente');
    if (tipoEspecial === 'horario') {
      const incompletos = horariosEspeciales.some(h => !h.hora_inicio || !h.hora_fin || !h.cupos);
      if (incompletos) return setMensajeEspecial('Completa todos los campos de los horarios');
    }
    try {
      await API.post('/admin/excepciones', {
        lugar_id: lugar.id,
        fecha: fechaEspecial,
        cerrado: tipoEspecial === 'cerrado',
        horarios: tipoEspecial === 'horario' ? horariosEspeciales : [],
        motivo: motivoEspecial,
      });
      cargarExcepciones(lugar.id);
      cerrarModalEspecial();
      mostrarMensaje('Día especial guardado correctamente');
    } catch (err) {
      setMensajeEspecial(err.response?.data?.error || 'Error al guardar');
    }
  };

  const eliminarExcepcion = async (fecha) => {
    try {
      const fechaLimpia = String(fecha).slice(0, 10);
      await API.delete(`/admin/excepciones/${lugar.id}/${fechaLimpia}`);
      cargarExcepciones(lugar.id);
      mostrarMensaje('Día especial eliminado');
    } catch (err) {
      mostrarMensaje('Error al eliminar');
    }
  };

  const toggleDiaCopia = (dia) => setDiasCopia(prev => prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]);
  const horariosPorDia = (dia) => horarios.filter(h => h.dia === dia && h.activo);

  const excepcionesPorFecha = excepciones.reduce((acc, e) => {
    const fechaKey = String(e.fecha).slice(0, 10);
    if (!acc[fechaKey]) acc[fechaKey] = { cerrado: e.cerrado, motivo: e.motivo, horarios: [] };
    if (!e.cerrado) acc[fechaKey].horarios.push(e);
    return acc;
  }, {});

  const cargarAsistencia = async (fecha) => {
    try {
      const res = await API.get(`/asistencia/horarios-dia/${lugar.id}/${fecha}`);
      setHorariosDelDia(res.data);
      setListaAsistencia([]);
      setHorarioActivo(null);
    } catch (err) {}
  };

  const cargarReservasHorario = async (horario) => {
    try {
      const res = await API.get(`/asistencia/horario/${horario.horario_id}/${fechaAsistencia}`);
      setListaAsistencia(res.data);
      setHorarioActivo(horario);
    } catch (err) {}
  };

  const cargarSaldos = async () => {
    try {
      const res = await API.get(`/asistencia/saldos/${lugar.id}`);
      setSaldos(res.data);
    } catch (err) {}
  };

  const cargarSaldosAuto = async (lugar_id) => {
    try {
      const res = await API.get(`/asistencia/saldos/${lugar_id}`);
      setSaldos(res.data);
    } catch (err) {}
  };

  const marcarAsistencia = async (reserva_id, usuario_id, asistio) => {
    try {
      await API.post('/asistencia/marcar', {
        reserva_id, usuario_id, lugar_id: lugar.id,
        fecha: fechaAsistencia, asistio
      });
      cargarReservasHorario(horarioActivo);
      cargarSaldos();
      setMensajeAsistencia(asistio ? 'Asistencia marcada' : 'Falta registrada y notificación enviada');
      setTimeout(() => setMensajeAsistencia(''), 3000);
    } catch (err) {
      setMensajeAsistencia('Error al marcar asistencia');
    }
  };

  const marcarTodos = async () => {
    try {
      await API.post('/asistencia/todos', { lugar_id: lugar.id, fecha: fechaAsistencia });
      cargarReservasHorario(horarioActivo);
      setMensajeAsistencia('Todos marcados como asistieron');
      setTimeout(() => setMensajeAsistencia(''), 3000);
    } catch (err) {}
  };

  const registrarPagoLibre = async (usuario_id, monto) => {
    if (!monto || parseFloat(monto) <= 0) return mostrarMensaje('Ingresa un monto válido');
    try {
      await API.put(`/asistencia/saldos/${usuario_id}/${lugar.id}/pago`, { monto_pagado: monto });
      setPagoForm({});
      cargarSaldos();
      mostrarMensaje('Pago registrado correctamente');
    } catch (err) {
      mostrarMensaje('Error al registrar pago');
    }
  };

  const cargarFotos = (lugar_id) =>
  API.get(`/fotos/${lugar_id}`)
    .then(res => {
      console.log('FOTOS DEL LUGAR:', res.data);
      setFotos(res.data);
    })
    .catch(err => {
      console.error('ERROR AL CARGAR FOTOS:', err);
    });

  const subirFoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSubiendoFoto(true);

    const formData = new FormData();
    formData.append('foto', file);

    try {
      await API.post(`/fotos/${lugar.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      cargarFotos(lugar.id);
      mostrarMensaje('Foto subida correctamente');
    } catch (err) {
      mostrarMensaje('Error al subir foto');
    }

    setSubiendoFoto(false);
  };

  const eliminarFoto = async (id) => {
    try {
      await API.delete(`/fotos/${id}`);

      setFotos(prev => prev.filter(f => f.id !== id));

      mostrarMensaje('Foto eliminada');
    } catch (err) {
      mostrarMensaje('Error al eliminar foto');
    }
  };

  // MOVER FOTO Y CAMBIAR PORTADA
  const moverFoto = async (indice, direccion) => {
    const nuevoIndice = indice + direccion;

    if (nuevoIndice < 0 || nuevoIndice >= fotos.length) {
      return;
    }

    const nuevasFotos = [...fotos];

    [nuevasFotos[indice], nuevasFotos[nuevoIndice]] = [
      nuevasFotos[nuevoIndice],
      nuevasFotos[indice]
    ];

    try {
      await API.put('/fotos/orden', {
        fotos: nuevasFotos
      });

      const fotosActualizadas = nuevasFotos.map((foto, index) => ({
        ...foto,
        orden: index + 1
      }));

      setFotos(fotosActualizadas);

      // Si el carrusel estaba viendo una de las fotos intercambiadas,
      // mantenerlo apuntando a la misma posición visual.
      if (fotoIndexAdmin === indice) {
        setFotoIndexAdmin(nuevoIndice);
      } else if (fotoIndexAdmin === nuevoIndice) {
        setFotoIndexAdmin(indice);
      }

      mostrarMensaje('Orden de fotos actualizado');

    } catch (err) {
      console.error('ERROR AL REORDENAR FOTOS:', err);
      mostrarMensaje(
        err.response?.data?.error ||
        'Error al cambiar el orden de las fotos'
      );
    }
  };

  const cerrarSesion = () => { localStorage.clear(); navigate('/'); };

  const guardarPerfilAdmin = async () => {
    try {
      await API.put(`/usuarios/${usuario.id}`, perfilForm);
      const actualizado = { ...usuario, ...perfilForm };
      localStorage.setItem('usuario', JSON.stringify(actualizado));
      setEditandoPerfil(false);
      mostrarMensaje('Perfil actualizado correctamente');
    } catch (err) {
      mostrarMensaje(err.response?.data?.error || 'Error al actualizar');
    }
  };

  const cambiarPasswordAdmin = async () => {
    if (!passFormAdmin.actual || !passFormAdmin.nueva || !passFormAdmin.confirmar) {
      mostrarMensaje('Completa todos los campos');
      return;
    }
    if (passFormAdmin.nueva !== passFormAdmin.confirmar) {
      mostrarMensaje('Las contraseñas no coinciden');
      return;
    }
    const contrasenaRegex = /^(?=.*[a-zA-Z])(?=.*[0-9]).{6,}$/;
    if (!contrasenaRegex.test(passFormAdmin.nueva)) {
      mostrarMensaje('La nueva contraseña debe tener letras y números, mínimo 6 caracteres');
      return;
    }
    try {
      await API.put(`/usuarios/${usuario.id}/password`, passFormAdmin);
      setPassFormAdmin({ actual: '', nueva: '', confirmar: '' });
      setEditandoPassAdmin(false);
      mostrarMensaje('Contraseña actualizada correctamente');
    } catch (err) {
      mostrarMensaje(err.response?.data?.error || 'Error al cambiar contraseña');
    }
  };

  if (!lugar) return (
    <div style={styles.loading}>
      <div style={styles.loadingSpinner}></div>
      <p>Cargando panel...</p>
    </div>
  );

  const tabsList = [
    { id: 'info', label: 'Info', icon: '🏢' },
    { id: 'horarios', label: 'Horarios', icon: '🕐' },
    { id: 'inscripciones', label: 'Inscritos', icon: '👥' },
    { id: 'asistencia', label: 'Asistencia', icon: '✓' },
    { id: 'perfil', label: 'Perfil', icon: '👤' },
  ];

  return (
    <div style={styles.container}>
      {/* MODAL TERMINOS Y CONDICIONES OBLIGATORIO PARA ADMIN */}
      <TerminosModal
        abierto={modalTerminosAdmin}
        onCerrar={forzarTerminos ? rechazarTerminosAdmin : () => setModalTerminosAdmin(false)}
        onAceptar={aceptarTerminosAdmin}
        esAdmin={true}
      />

      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <p style={styles.headerSubtitulo}>Administrador</p>
          <h2 style={styles.headerTitulo}>{lugar.nombre}</h2>
        </div>
        <div style={styles.headerAcciones}>
          <button onClick={cambiarTema} style={styles.iconBtnDark} aria-label="Cambiar tema">
            {tema === 'light' ? '🌙' : '☀️'}
          </button>
          <button style={styles.btnSalir} onClick={cerrarSesion} aria-label="Salir">
            ⏻
          </button>
        </div>
      </div>

      {/* TABS */}
      <div style={styles.tabs}>
        {tabsList.map(t => (
          <button
            key={t.id}
            style={{
              ...styles.tab,
              ...(tab === t.id ? styles.tabActivo : {})
            }}
            onClick={() => setTab(t.id)}
          >
            <span style={styles.tabIcon}>{t.icon}</span>
            <span style={styles.tabLabel}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* MENSAJE GLOBAL */}
      {mensaje && (
        <div style={styles.mensajeGlobal}>
          <span style={styles.mensajeIcon}>✓</span>
          {mensaje}
        </div>
      )}

      {/* LIGHTBOX FOTOS */}
      {fotoAmpliadaAdmin !== null && (
        <div style={styles.lightboxOverlay} onClick={() => setFotoAmpliadaAdmin(null)}>
          <button onClick={() => setFotoAmpliadaAdmin(null)} style={styles.lightboxCerrar}>✕</button>
          {fotoAmpliadaAdmin > 0 && (
            <button onClick={(e) => { e.stopPropagation(); setFotoAmpliadaAdmin(fotoAmpliadaAdmin - 1); }} style={{ ...styles.lightboxNav, left: 12 }}>‹</button>
          )}
          {fotoAmpliadaAdmin < fotos.length - 1 && (
            <button onClick={(e) => { e.stopPropagation(); setFotoAmpliadaAdmin(fotoAmpliadaAdmin + 1); }} style={{ ...styles.lightboxNav, right: 12 }}>›</button>
          )}
          <img src={fotos[fotoAmpliadaAdmin]?.url} alt="" style={styles.lightboxImg} onClick={e => e.stopPropagation()} />
          <p style={styles.lightboxContador}>{fotoAmpliadaAdmin + 1} / {fotos.length}</p>
        </div>
      )}

      {/* MODAL ELIMINAR */}
      {confirmarEliminar && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalIconWarn}>⚠</div>
            <p style={styles.cardTitulo}>Confirmar eliminación</p>
            <p style={styles.cardSub}>
              ¿Estás seguro que deseas eliminar a <strong>{confirmarEliminar.nombre} {confirmarEliminar.apellido}</strong> del lugar? Esta acción no se puede deshacer.
            </p>
            <div style={styles.botonesRow}>
              <button style={styles.btnPeligro} onClick={() => eliminarInscripcion(confirmarEliminar.id)}>Sí, eliminar</button>
              <button style={styles.btnCancelar} onClick={() => setConfirmarEliminar(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VER INSCRITOS */}
      {modalInscritos && (
        <div style={styles.modalOverlay} onClick={() => setModalInscritos(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeaderInscritos}>
              <div style={{ flex: 1 }}>
                <p style={styles.cardTitulo}>👥 Inscritos</p>
                <p style={styles.cardSub}>
                  {formatHora(modalInscritos.horario.hora_inicio)} - {formatHora(modalInscritos.horario.hora_fin)}
                </p>
              </div>
              <button style={styles.btnCerrarModal} onClick={() => setModalInscritos(null)}>✕</button>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Ver inscritos para:</label>
              <input
                style={styles.input}
                type="date"
                value={fechaInscritos}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => cambiarFechaInscritos(e.target.value)}
              />
              <p style={styles.hint}>{formatFechaLarga(fechaInscritos)}</p>
            </div>

            <div style={styles.contadorInscritos}>
              <span style={styles.contadorNumero}>{personasInscritas.length}</span>
              <span style={styles.contadorTexto}>
                {personasInscritas.length === 1 ? 'persona inscrita' : 'personas inscritas'} de {modalInscritos.horario.cupos} cupos
              </span>
            </div>

            {personasInscritas.length === 0 ? (
              <div style={styles.vacio}>
                <div style={styles.vacioIcon}>📅</div>
                <p style={styles.vacioTexto}>Aún no hay nadie inscrito en esta fecha</p>
              </div>
            ) : (
              <div style={styles.listaInscritos}>
                {personasInscritas.map((p, idx) => (
                  <div key={idx} style={styles.personaRow}>
                    <div style={styles.cardIcono}>
                      {p.nombre?.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-principal)' }}>
                        {p.nombre} {p.apellido}
                      </p>
                      {p.correo && (
                        <p style={{ fontSize: 11, color: 'var(--text-suave)', marginTop: 2 }}>
                          {p.correo}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button style={styles.btnCancelar} onClick={() => setModalInscritos(null)}>Cerrar</button>
          </div>
        </div>
      )}

      {/* MODAL DIA ESPECIAL */}
      {modalEspecial && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <p style={styles.cardTitulo}>Gestionar día especial</p>
            <p style={styles.cardSub}>Solo afecta la fecha exacta que elijas</p>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Fecha</label>
              <input style={styles.input} type="date" min={new Date().toISOString().split('T')[0]} value={fechaEspecial} onChange={e => setFechaEspecial(e.target.value)} />
            </div>

            <div style={styles.tipoEspecialRow}>
              <button
                style={{
                  ...styles.diaBadge,
                  background: tipoEspecial === 'cerrado' ? 'var(--color-error)' : 'var(--bg-hover)',
                  color: tipoEspecial === 'cerrado' ? '#fff' : 'var(--text-secundario)',
                  borderColor: tipoEspecial === 'cerrado' ? 'var(--color-error)' : 'var(--border-suave)',
                }}
                onClick={() => setTipoEspecial('cerrado')}
              >
                🔒 Cerrado ese día
              </button>
              <button
                style={{
                  ...styles.diaBadge,
                  background: tipoEspecial === 'horario' ? 'var(--color-primario)' : 'var(--bg-hover)',
                  color: tipoEspecial === 'horario' ? '#fff' : 'var(--text-secundario)',
                  borderColor: tipoEspecial === 'horario' ? 'var(--color-primario)' : 'var(--border-suave)',
                }}
                onClick={() => setTipoEspecial('horario')}
              >
                ⏰ Horario diferente
              </button>
            </div>

            {tipoEspecial === 'horario' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={styles.hint}>Estos horarios reemplazan los normales solo en esta fecha:</p>
                {horariosEspeciales.map((h, i) => (
                  <div key={i} style={styles.horarioEspecialItem}>
                    <input style={styles.inputSmall} type="time" value={h.hora_inicio} onChange={e => actualizarHorarioEspecial(i, 'hora_inicio', e.target.value)} />
                    <input style={styles.inputSmall} type="time" value={h.hora_fin} onChange={e => actualizarHorarioEspecial(i, 'hora_fin', e.target.value)} />
                    <input style={styles.inputSmall} type="number" inputMode="numeric" placeholder="Cupos" min="1" value={h.cupos} onChange={e => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val) && val >= 1) actualizarHorarioEspecial(i, 'cupos', val);
                      else if (e.target.value === '') actualizarHorarioEspecial(i, 'cupos', '');
                    }} />
                    {horariosEspeciales.length > 1 && (
                      <button style={styles.btnCancelarSmall} onClick={() => quitarHorarioEspecial(i)}>X</button>
                    )}
                  </div>
                ))}
                <button style={styles.btnCopiar} onClick={agregarHorarioEspecial}>+ Agregar otro horario</button>
              </div>
            )}

            <input style={styles.input} placeholder="Motivo (ej: Feriado nacional)" value={motivoEspecial} onChange={e => setMotivoEspecial(e.target.value)} />

            {mensajeEspecial && <p style={styles.errorTexto}>{mensajeEspecial}</p>}

            <div style={styles.botonesRow}>
              <button style={styles.btnGuardar} onClick={guardarExcepcion}>Guardar</button>
              <button style={styles.btnCancelar} onClick={cerrarModalEspecial}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.content}>
        {/* TAB INFO */}
        {tab === 'info' && (
          <div style={styles.tabContent}>
            {fotos.length > 0 ? (
              <div style={styles.carruselContainer}>
                <img src={fotos[fotoIndexAdmin]?.url} alt="lugar" style={styles.carruselImg} onClick={() => setFotoAmpliadaAdmin(fotoIndexAdmin)} />
                {fotos.length > 1 && (
                  <>
                    <button onClick={() => setFotoIndexAdmin(fotoIndexAdmin === 0 ? fotos.length - 1 : fotoIndexAdmin - 1)} style={{ ...styles.carruselBtn, left: 12 }}>‹</button>
                    <button onClick={() => setFotoIndexAdmin(fotoIndexAdmin === fotos.length - 1 ? 0 : fotoIndexAdmin + 1)} style={{ ...styles.carruselBtn, right: 12 }}>›</button>
                    <div style={styles.carruselIndicadores}>
                      {fotos.map((_, i) => (
                        <span key={i} onClick={() => setFotoIndexAdmin(i)} style={{
                          ...styles.indicador,
                          background: i === fotoIndexAdmin ? '#fff' : 'rgba(255,255,255,0.5)',
                          width: i === fotoIndexAdmin ? 24 : 8,
                        }} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div style={styles.sinFotos}>
                <span style={{ fontSize: 40 }}>📷</span>
                <p>Aún no has subido fotos</p>
              </div>
            )}

            {fotos.length > 1 && (
              <div style={styles.miniaturasContainer}>
                {fotos.map((f, i) => (
                  <img
                    key={f.id}
                    src={f.url}
                    alt=""
                    onClick={() => setFotoIndexAdmin(i)}
                    style={{
                      ...styles.miniatura,
                      border: i === fotoIndexAdmin ? '2px solid var(--color-primario)' : '2px solid transparent',
                      opacity: i === fotoIndexAdmin ? 1 : 0.6,
                    }}
                  />
                ))}
              </div>
            )}

            {editando ? (
              <div style={styles.card}>
                <p style={styles.cardTitulo}>Editando información</p>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Nombre del lugar</label>
                  <input style={styles.input} placeholder="Nombre" value={infoForm.nombre || ''} onChange={e => setInfoForm({ ...infoForm, nombre: e.target.value })} />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Descripción</label>
                  <textarea style={styles.textarea} placeholder="Descripción" value={infoForm.descripcion || ''} onChange={e => setInfoForm({ ...infoForm, descripcion: e.target.value })} />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Dirección</label>
                  <input style={styles.input} placeholder="Dirección" value={infoForm.direccion || ''} onChange={e => setInfoForm({ ...infoForm, direccion: e.target.value })} />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Link de Google Maps (opcional)</label>
                  <input style={styles.input} placeholder="https://maps.google.com/..." value={infoForm.maps_url || ''} onChange={e => setInfoForm({ ...infoForm, maps_url: e.target.value })} />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Teléfono</label>
                  <input style={styles.input} placeholder="0987654321" value={infoForm.telefono || ''} onChange={e => setInfoForm({ ...infoForm, telefono: e.target.value })} />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Categoría</label>
                  <select style={styles.input} value={infoForm.categoria || 'general'} onChange={e => setInfoForm({ ...infoForm, categoria: e.target.value })}>
                    <option value="general">General</option>
                    <option value="gym">Gym</option>
                    <option value="crossfit">Crossfit</option>
                    <option value="canchas">Canchas</option>
                    <option value="natacion">Natación</option>
                    <option value="yoga">Yoga</option>
                  </select>
                </div>

                <div style={styles.galeriaSeccion}>
                  <p style={styles.galeriaTitulo}>Galería de fotos</p>
                  <p style={styles.galeriaSubtitulo}>Sube las fotos que quieras mostrar en tu lugar</p>
                  <label style={{ ...styles.btnAgregar, textAlign: 'center', cursor: subiendoFoto ? 'wait' : 'pointer', opacity: subiendoFoto ? 0.6 : 1, display: 'block' }}>
                    {subiendoFoto ? 'Subiendo...' : '+ Subir foto'}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={subirFoto} disabled={subiendoFoto} />
                  </label>
                  {fotos.length === 0 ? (
                    <p style={styles.galeriaVacia}>Aún no has subido fotos</p>
                  ) : (
                    <div style={styles.galeriaGrid}>
                      {fotos.map((f, indice) => (
                        <div key={f.id} style={styles.galeriaFotoItem}>

                          <img
                            src={f.url}
                            alt={`Foto ${indice + 1}`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />

                          {/* Indicador de posición */}
                          <div
                            style={{
                              position: 'absolute',
                              top: '8px',
                              left: '8px',
                              background: 'rgba(0, 0, 0, 0.75)',
                              color: '#fff',
                              padding: '5px 9px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }}
                          >
                            {indice === 0 ? '⭐ PORTADA' : `Foto ${indice + 1}`}
                          </div>

                          {/* Controles */}
                          <div
                            style={{
                              position: 'absolute',
                              bottom: '8px',
                              left: '8px',
                              right: '8px',
                              display: 'flex',
                              gap: '6px',
                              justifyContent: 'center'
                            }}
                          >

                            {/* Mover arriba */}
                            <button
                              onClick={() => moverFoto(indice, -1)}
                              disabled={indice === 0}
                              style={{
                                border: 'none',
                                borderRadius: '6px',
                                padding: '7px 11px',
                                cursor: indice === 0 ? 'default' : 'pointer',
                                opacity: indice === 0 ? 0.4 : 1
                              }}
                              title="Mover a la izquierda"
                            >
                              ⬅️
                            </button>

                            {/* Mover abajo */}
                            <button
                              onClick={() => moverFoto(indice, 1)}
                              disabled={indice === fotos.length - 1}
                              style={{
                                border: 'none',
                                borderRadius: '6px',
                                padding: '7px 11px',
                                cursor: indice === fotos.length - 1 ? 'default' : 'pointer',
                                opacity: indice === fotos.length - 1 ? 0.4 : 1
                              }}
                              title="Mover a la derecha"
                            >
                              ➡️
                            </button>

                            {/* Eliminar */}
                            <button
                              onClick={() => eliminarFoto(f.id)}
                              style={styles.btnEliminarFoto}
                              title="Eliminar foto"
                            >
                              🗑️
                            </button>

                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={styles.botonesRow}>
                  <button style={styles.btnGuardar} onClick={guardarInfo}>Guardar</button>
                  <button style={styles.btnCancelar} onClick={() => { setEditando(false); setInfoForm(lugar); }}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div style={styles.card}>
                <div style={styles.cardHeaderRow}>
                  <div style={{ flex: 1 }}>
                    <p style={styles.cardTituloGrande}>{lugar.nombre}</p>
                    {lugar.categoria && lugar.categoria !== 'general' && (
                      <span style={styles.categoriaBadge}>{lugar.categoria}</span>
                    )}
                  </div>
                  <button style={styles.btnEditar} onClick={() => setEditando(true)}>Editar</button>
                </div>
                {lugar.descripcion && <p style={styles.cardSub}>{lugar.descripcion}</p>}
                <div style={styles.infoLista}>
                  <div style={styles.infoItem}>
                    <span style={styles.infoIcon}>📍</span>
                    <span style={styles.infoTexto}>{lugar.direccion}</span>
                  </div>
                  {lugar.maps_url && (
                    <div style={styles.infoItem}>
                      <span style={styles.infoIcon}>🗺️</span>
                      <span style={styles.infoTexto}>Link de Maps configurado</span>
                    </div>
                  )}
                  <div style={styles.infoItem}>
                    <span style={styles.infoIcon}>📞</span>
                    <span style={styles.infoTexto}>{lugar.telefono}</span>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoIcon}>📷</span>
                    <span style={styles.infoTexto}>{fotos.length} foto{fotos.length !== 1 ? 's' : ''} en galería</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB HORARIOS */}
        {tab === 'horarios' && (
          <div style={styles.tabContent}>
            <button style={styles.btnEspecial} onClick={abrirModalEspecial}>
              ⚡ Gestionar día especial
            </button>

            {Object.keys(excepcionesPorFecha).length > 0 && (
              <div style={styles.card}>
                <p style={styles.cardTitulo}>Días especiales programados</p>
                {Object.entries(excepcionesPorFecha).map(([fecha, datos]) => (
                  <div key={fecha} style={{
                    ...styles.excepcionCard,
                    background: datos.cerrado ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    borderColor: datos.cerrado ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                  }}>
                    <div style={styles.excepcionHeader}>
                      <p style={styles.excepcionFecha}>{formatFechaLarga(fecha)}</p>
                      <button style={styles.btnEliminarHorario} onClick={() => eliminarExcepcion(fecha)}>Eliminar día</button>
                    </div>
                    {datos.motivo && <p style={styles.excepcionMotivo}>📌 {datos.motivo}</p>}
                    {datos.cerrado ? (
                      <p style={{ fontSize: 12, color: 'var(--color-error)', fontWeight: 700 }}>🔴 Cerrado</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                        {datos.horarios.map(h => (
                          <div key={h.id}>
                            {horarioEspecialEditando?.id === h.id ? (
                              <div style={styles.editRow}>
                                <input style={styles.inputSmall} type="time" value={editFormEspecial.hora_inicio} onChange={e => setEditFormEspecial({ ...editFormEspecial, hora_inicio: e.target.value })} />
                                <input style={styles.inputSmall} type="time" value={editFormEspecial.hora_fin} onChange={e => setEditFormEspecial({ ...editFormEspecial, hora_fin: e.target.value })} />
                                <input style={styles.inputSmall} type="number" inputMode="numeric" placeholder="Cupos" min="1"
                                  value={editFormEspecial.cupos}
                                  onChange={e => {
                                    const val = parseInt(e.target.value);
                                    if (!isNaN(val) && val >= 1) setEditFormEspecial({ ...editFormEspecial, cupos: val });
                                    else if (e.target.value === '') setEditFormEspecial({ ...editFormEspecial, cupos: '' });
                                  }}
                                />
                                <button style={styles.btnGuardarSmall} onClick={guardarEdicionEspecial}>OK</button>
                                <button style={styles.btnCancelarSmall} onClick={() => setHorarioEspecialEditando(null)}>X</button>
                              </div>
                            ) : (
                              <div style={styles.horarioRowConBoton}>
                                <div style={{ ...styles.horarioRow, borderLeft: '3px solid var(--color-advertencia)' }}>
                                  <span style={{ ...styles.horarioTexto, color: 'var(--color-advertencia)' }}>
                                    {formatHora(h.hora_inicio)} - {formatHora(h.hora_fin)}
                                  </span>
                                  <span style={styles.cuposTexto}>👥 {h.cupos} cupos</span>
                                  <button style={styles.btnEditarHorario} onClick={() => {
                                    setHorarioEspecialEditando(h);
                                    setEditFormEspecial({ hora_inicio: h.hora_inicio.slice(0, 5), hora_fin: h.hora_fin.slice(0, 5), cupos: h.cupos });
                                  }}>Editar</button>
                                  <button style={styles.btnEliminarHorario} onClick={() => eliminarHorarioEspecialIndividual(h.id)}>Eliminar</button>
                                </div>
                                <button
                                  style={{ ...styles.btnVerInscritos, borderColor: 'rgba(245,158,11,0.4)', color: 'var(--color-advertencia)', background: 'rgba(245,158,11,0.08)' }}
                                  onClick={() => {
                                    setFechaInscritos(fecha.slice(0, 10));
                                    verInscritosAdmin(h, fecha.slice(0, 10));
                                  }}
                                >
                                  👥 Ver inscritos
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

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
                        background: horariosSeleccionados.includes(h.id) ? 'var(--color-primario-suave)' : 'var(--bg-hover)',
                        borderColor: horariosSeleccionados.includes(h.id) ? 'var(--color-primario-borde)' : 'var(--border-suave)',
                      }}>
                        <input
                          type="checkbox"
                          checked={horariosSeleccionados.includes(h.id)}
                          onChange={() => setHorariosSeleccionados(prev =>
                            prev.includes(h.id) ? prev.filter(id => id !== h.id) : [...prev, h.id]
                          )}
                        />
                        <span style={{ fontWeight: 700, color: 'var(--color-primario)' }}>{formatHora(h.hora_inicio)} - {formatHora(h.hora_fin)}</span>
                        <span style={{ color: 'var(--text-secundario)' }}>· {h.cupos} cupos</span>
                      </label>
                    ))}
                  </div>
                  <p style={styles.cardSub}>Copiar a estos días:</p>
                  <div style={styles.diasGrid}>
                    {DIAS.filter(d => d !== copiandoDia).map(d => (
                      <button
                        key={d}
                        onClick={() => toggleDiaCopia(d)}
                        style={{
                          ...styles.diaBadge,
                          background: diasCopia.includes(d) ? 'var(--color-primario)' : 'var(--bg-hover)',
                          color: diasCopia.includes(d) ? '#fff' : 'var(--text-secundario)',
                          borderColor: diasCopia.includes(d) ? 'var(--color-primario)' : 'var(--border-suave)',
                        }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  {mensajeCopia && <p style={styles.errorTexto}>{mensajeCopia}</p>}
                  <div style={styles.botonesRow}>
                    <button style={styles.btnGuardar} onClick={copiarHorarios}>Copiar</button>
                    <button style={styles.btnCancelar} onClick={() => { setCopiandoDia(null); setDiasCopia([]); setHorariosSeleccionados([]); setMensajeCopia(''); }}>Cancelar</button>
                  </div>
                </div>
              </div>
            )}

            {DIAS.map(dia => {
              const hoyTmp = new Date();
              const diaActualTmp = hoyTmp.getDay();
              const diaObjetivoTmp = DIAS_JS.indexOf(dia);
              let diffDias = diaObjetivoTmp - diaActualTmp;
              if (diffDias < 0) diffDias += 7;
              const fechaProxima = new Date(hoyTmp);
              fechaProxima.setDate(hoyTmp.getDate() + diffDias);
              const yy = fechaProxima.getFullYear();
              const mm = String(fechaProxima.getMonth() + 1).padStart(2, '0');
              const dd = String(fechaProxima.getDate()).padStart(2, '0');
              const fechaProximaStr = `${yy}-${mm}-${dd}`;
              const tieneExcepcion = excepcionesPorFecha[fechaProximaStr];

              return (
                <div key={dia} style={styles.diaCard}>
                  <div style={styles.diaHeader} onClick={() => setDiaSeleccionado(diaSeleccionado === dia ? null : dia)}>
                    <div style={styles.diaNombreWrap}>
                      <span style={styles.diaNombre}>{dia}</span>
                      <span style={styles.diaFecha}>{getFechaDelDia(dia)}</span>
                      {tieneExcepcion && (
                        <span style={{
                          fontSize: 10,
                          color: tieneExcepcion.cerrado ? 'var(--color-error)' : 'var(--color-advertencia)',
                          fontWeight: 700,
                          marginTop: 2
                        }}>
                          {tieneExcepcion.cerrado ? '🔴 CERRADO' : '⚡ ESPECIAL'}
                        </span>
                      )}
                    </div>
                    <div style={styles.horariosResumen}>
                      {horariosPorDia(dia).length === 0 ? (
                        <span style={styles.cerradoBadge}>Sin horarios</span>
                      ) : (
                        horariosPorDia(dia).map(h => (
                          <span key={h.id} style={styles.horarioBadge}>
                            {formatHora(h.hora_inicio)}-{formatHora(h.hora_fin)}
                          </span>
                        ))
                      )}
                    </div>
                    <span style={styles.chevron}>{diaSeleccionado === dia ? '▲' : '▼'}</span>
                  </div>

                  {diaSeleccionado === dia && (
                    <div style={styles.diaDetalle}>
                      {tieneExcepcion && (
                        <div style={{
                          ...styles.motivoBox,
                          background: tieneExcepcion.cerrado ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          color: tieneExcepcion.cerrado ? 'var(--color-error)' : 'var(--color-advertencia)',
                          border: `1px solid ${tieneExcepcion.cerrado ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
                        }}>
                          {tieneExcepcion.cerrado ? '🔒 Cerrado este día (excepción)' : '⚡ Este día tiene horarios especiales que reemplazan los normales'}
                        </div>
                      )}

                      {horariosPorDia(dia).map(h => (
                        <div key={h.id}>
                          {horarioEditando?.id === h.id ? (
                            <div style={styles.editRow}>
                              <input style={styles.inputSmall} type="time" value={editForm.hora_inicio} onChange={e => setEditForm({ ...editForm, hora_inicio: e.target.value })} />
                              <input style={styles.inputSmall} type="time" value={editForm.hora_fin} onChange={e => setEditForm({ ...editForm, hora_fin: e.target.value })} />
                              <input style={styles.inputSmall} type="number" inputMode="numeric" pattern="[0-9]*" placeholder={lugar.categoria === 'canchas' ? 'Cant.' : 'Cupos'} min="1"
                                value={editForm.cupos}
                                onChange={e => {
                                  const val = parseInt(e.target.value);
                                  if (!isNaN(val) && val >= 1) setEditForm({ ...editForm, cupos: val });
                                  else if (e.target.value === '') setEditForm({ ...editForm, cupos: '' });
                                }}
                              />
                              {lugar.categoria === 'canchas' && (
                                <select style={styles.inputSmall} value={editForm.tipo_cancha || ''} onChange={e => setEditForm({ ...editForm, tipo_cancha: e.target.value })}>
                                  <option value="">Tipo</option>
                                  <option value="5vs5">5 vs 5</option>
                                  <option value="6vs6">6 vs 6</option>
                                  <option value="7vs7">7 vs 7</option>
                                  <option value="8vs8">8 vs 8</option>
                                  <option value="9vs9">9 vs 9</option>
                                  <option value="10vs10">10 vs 10</option>
                                  <option value="11vs11">11 vs 11</option>
                                </select>
                              )}
                              <button style={styles.btnGuardarSmall} onClick={guardarEdicion}>OK</button>
                              <button style={styles.btnCancelarSmall} onClick={() => setHorarioEditando(null)}>X</button>
                            </div>
                          ) : (
                            <div style={styles.horarioRowConBoton}>
                              <div style={styles.horarioRow}>
                                <span style={styles.horarioTexto}>{formatHora(h.hora_inicio)} - {formatHora(h.hora_fin)}</span>
                                <span style={styles.cuposTexto}>
                                  {lugar.categoria === 'canchas' ? '⚽' : '👥'} {h.cupos} {lugar.categoria === 'canchas' ? `cancha(s) ${h.tipo_cancha || ''}` : 'cupos totales'}
                                </span>
                                <button style={styles.btnEditarHorario} onClick={() => { setHorarioEditando(h); setEditForm({ hora_inicio: h.hora_inicio.slice(0,5), hora_fin: h.hora_fin.slice(0,5), cupos: h.cupos, tipo_cancha: h.tipo_cancha || '' }); }}>Editar</button>
                                <button style={styles.btnEliminarHorario} onClick={() => eliminarHorario(h.id)}>Eliminar</button>
                              </div>
                              <button
                                style={styles.btnVerInscritos}
                                onClick={() => {
                                  const fechaPx = obtenerFechaProxima(dia);
                                  setFechaInscritos(fechaPx);
                                  verInscritosAdmin(h, fechaPx);
                                }}
                              >
                                👥 Ver inscritos
                              </button>
                            </div>
                          )}
                        </div>
                      ))}

                      {horariosPorDia(dia).length > 0 && (
                        <button style={styles.btnCopiar} onClick={() => { setCopiandoDia(dia); setDiasCopia([]); setHorariosSeleccionados([]); setMensajeCopia(''); }}>
                          📋 Copiar horarios de {dia} a otros días
                        </button>
                      )}

                      <div style={styles.agregarHorario}>
                        <p style={styles.agregarTitulo}>+ Agregar horario para {dia}</p>
                        <div style={styles.inputsRow}>
                          <input style={styles.inputSmall} type="time" value={nuevoHorario.hora_inicio} onChange={e => setNuevoHorario({ ...nuevoHorario, hora_inicio: e.target.value })} />
                          <input style={styles.inputSmall} type="time" value={nuevoHorario.hora_fin} onChange={e => setNuevoHorario({ ...nuevoHorario, hora_fin: e.target.value })} />
                          <input style={styles.inputSmall} type="number" inputMode="numeric" pattern="[0-9]*" placeholder={lugar.categoria === 'canchas' ? 'Cant. canchas' : 'Cupos'} min="1"
                            value={nuevoHorario.cupos}
                            onChange={e => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val) && val >= 1) setNuevoHorario({ ...nuevoHorario, cupos: val });
                              else if (e.target.value === '') setNuevoHorario({ ...nuevoHorario, cupos: '' });
                            }}
                          />
                        </div>
                        {lugar.categoria === 'canchas' && (
                          <select style={styles.input} value={nuevoHorario.tipo_cancha} onChange={e => setNuevoHorario({ ...nuevoHorario, tipo_cancha: e.target.value })}>
                            <option value="">Tipo de cancha</option>
                            <option value="5vs5">5 vs 5</option>
                            <option value="6vs6">6 vs 6</option>
                            <option value="7vs7">7 vs 7</option>
                            <option value="8vs8">8 vs 8</option>
                            <option value="9vs9">9 vs 9</option>
                            <option value="10vs10">10 vs 10</option>
                            <option value="11vs11">11 vs 11</option>
                          </select>
                        )}
                        <button style={styles.btnAgregar} onClick={agregarHorario}>Agregar horario</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* TAB INSCRIPCIONES */}
        {tab === 'inscripciones' && (
          <div style={styles.tabContent}>
            <div style={styles.searchBoxAdmin}>
              <span style={{ fontSize: 16, opacity: 0.6 }}>🔍</span>
              <input
                style={styles.searchInputAdmin}
                placeholder="Buscar por nombre, apellido o correo..."
                value={busquedaInscritos}
                onChange={e => setBusquedaInscritos(e.target.value)}
              />
              {busquedaInscritos && (
                <button style={styles.clearBtnAdmin} onClick={() => setBusquedaInscritos('')}>✕</button>
              )}
            </div>
            {(() => {
              const filtrados = inscripciones.filter(i => {
                if (!busquedaInscritos.trim()) return true;
                const q = busquedaInscritos.toLowerCase();
                return (
                  i.nombre?.toLowerCase().includes(q) ||
                  i.apellido?.toLowerCase().includes(q) ||
                  i.correo?.toLowerCase().includes(q)
                );
              });
              if (inscripciones.length === 0) return (
                <div style={styles.vacio}>
                  <div style={styles.vacioIcon}>👥</div>
                  <p style={styles.vacioTexto}>No hay solicitudes aún</p>
                </div>
              );
              if (filtrados.length === 0) return (
                <div style={styles.vacio}>
                  <div style={styles.vacioIcon}>🔍</div>
                  <p style={styles.vacioTexto}>No se encontró a nadie con ese nombre</p>
                </div>
              );
              return filtrados.map(i => (
                <div key={i.id} style={styles.card}>
                  <div style={styles.cardHeaderRow}>
                    <div style={styles.cardIcono}>
                      {i.nombre?.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={styles.cardTitulo}>{i.nombre} {i.apellido}</p>
                      <p style={styles.cardSub}>{i.correo}</p>
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
                  {i.estado === 'pendiente' && (
                    <div style={styles.acciones}>
                      <button style={styles.btnAprobar} onClick={() => aprobarInscripcion(i.id)}>✓ Aprobar</button>
                      <button style={styles.btnRechazar} onClick={() => rechazarInscripcion(i.id)}>✕ Rechazar</button>
                    </div>
                  )}
                  {i.estado === 'aprobada' && (
                    <div style={styles.acciones}>
                      <button style={styles.btnPeligro} onClick={() => setConfirmarEliminar(i)}>Eliminar del lugar</button>
                    </div>
                  )}
                  {i.estado === 'rechazada' && (
                    <div style={styles.acciones}>
                      <button style={styles.btnAprobar} onClick={() => aprobarInscripcion(i.id)}>✓ Aprobar</button>
                      <button style={styles.btnPeligro} onClick={() => setConfirmarEliminar(i)}>Eliminar</button>
                    </div>
                  )}
                </div>
              ));
            })()}
          </div>
        )}

        {/* TAB ASISTENCIA */}
        {tab === 'asistencia' && (
          <div style={styles.tabContent}>
            <div style={styles.card}>
              <p style={styles.cardTitulo}>Pasar lista</p>
              <p style={styles.cardSub}>Selecciona la fecha para ver las reservas</p>
              <input style={styles.input} type="date" value={fechaAsistencia}
                onChange={e => { setFechaAsistencia(e.target.value); cargarAsistencia(e.target.value); }}
              />
              <button style={styles.btnAgregar} onClick={() => cargarAsistencia(fechaAsistencia)}>Cargar lista</button>
              {mensajeAsistencia && (
                <p style={styles.exitoTexto}>{mensajeAsistencia}</p>
              )}
            </div>

            {horariosDelDia.length > 0 && !horarioActivo && (
              <div style={styles.card}>
                <p style={styles.cardTitulo}>Horarios con reservas</p>
                <p style={styles.cardSub}>{formatFechaLarga(fechaAsistencia)}</p>
                {horariosDelDia.map(h => (
                  <div key={h.horario_id} style={{ ...styles.horarioRow, cursor: 'pointer' }} onClick={() => cargarReservasHorario(h)}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-primario)' }}>{formatHora(h.hora_inicio)} - {formatHora(h.hora_fin)}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-suave)', marginTop: 2 }}>{h.reservados} de {h.cupos} cupos reservados</p>
                    </div>
                    <button style={styles.btnAprobar}>Pasar lista</button>
                  </div>
                ))}
              </div>
            )}

            {horarioActivo && (
              <div style={styles.card}>
                <div style={styles.horarioActivoHeader}>
                  <div>
                    <p style={styles.cardTitulo}>{formatHora(horarioActivo.hora_inicio)} - {formatHora(horarioActivo.hora_fin)}</p>
                    <p style={styles.cardSub}>{horariosDelDia.find(h => h.horario_id === horarioActivo.horario_id)?.reservados} reservados</p>
                  </div>
                  <div style={styles.horarioActivoBotones}>
                    <button style={styles.btnEditar} onClick={() => { setHorarioActivo(null); setListaAsistencia([]); }}>← Volver</button>
                    <button style={styles.btnAprobar} onClick={marcarTodos}>✓ Todos asistieron</button>
                  </div>
                </div>
                {listaAsistencia.map(r => (
                  <div key={r.reserva_id} style={styles.personaRow}>
                    <div style={styles.cardIcono}>
                      {r.nombre?.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-principal)' }}>{r.nombre} {r.apellido}</p>
                    </div>
                    {r.asistio === null || r.asistio === undefined ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button style={styles.btnAprobarPeq} onClick={() => marcarAsistencia(r.reserva_id, r.usuario_id, true)}>Asistió</button>
                        <button style={styles.btnRechazarPeq} onClick={() => marcarAsistencia(r.reserva_id, r.usuario_id, false)}>Falta</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          ...styles.badge,
                          background: r.asistio ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: r.asistio ? 'var(--color-exito)' : 'var(--color-error)',
                          borderColor: r.asistio ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        }}>
                          {r.asistio ? '✓ Asistió' : '✕ Falta'}
                        </span>
                        <button style={styles.btnEditar} onClick={() => marcarAsistencia(r.reserva_id, r.usuario_id, !r.asistio)}>Cambiar</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {horariosDelDia.length === 0 && !horarioActivo && fechaAsistencia && (
              <div style={styles.vacio}>
                <div style={styles.vacioIcon}>📅</div>
                <p style={styles.vacioTexto}>No hay reservas para esta fecha</p>
              </div>
            )}

            {/* SALDOS PENDIENTES */}
            <div style={styles.card}>
              <div style={styles.cardHeaderRow}>
                <p style={styles.cardTitulo}>💳 Saldos pendientes</p>
                <button style={styles.btnEditar} onClick={cargarSaldos}>↻ Actualizar</button>
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
                  <button style={styles.clearBtnAdmin} onClick={() => setBusquedaSaldos('')}>✕</button>
                )}
              </div>
              {(() => {
                const conSaldo = saldos.filter(s => parseFloat(s.saldo_pendiente) > 0);
                const filtrados = conSaldo.filter(s => {
                  if (!busquedaSaldos.trim()) return true;
                  const q = busquedaSaldos.toLowerCase();
                  return s.nombre?.toLowerCase().includes(q) || s.apellido?.toLowerCase().includes(q);
                });
                if (conSaldo.length === 0) return (
                  <div style={styles.exitoBox}>
                    <span>✓</span>
                    <span>Ningún usuario tiene saldo pendiente</span>
                  </div>
                );
                if (filtrados.length === 0) return <p style={styles.vacioTextoCentrado}>No se encontró a nadie con ese nombre</p>;
                return filtrados.map(s => (
                  <div key={s.usuario_id} style={styles.saldoCard}>
                    <div style={styles.saldoCardHeader}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-principal)' }}>{s.nombre} {s.apellido}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-secundario)', marginTop: 2 }}>
                          {s.total_faltas} falta{s.total_faltas !== 1 ? 's' : ''} · Debe: <strong style={{ color: 'var(--color-error)' }}>${parseFloat(s.saldo_pendiente).toFixed(2)}</strong>
                        </p>
                      </div>
                      <button style={styles.btnAprobar} onClick={() => registrarPagoLibre(s.usuario_id, s.saldo_pendiente)}>
                        Pago total
                      </button>
                    </div>
                    <div style={styles.pagoParcialRow}>
                      <input
                        style={{ ...styles.inputSmall, maxWidth: 130 }}
                        type="number" inputMode="decimal" placeholder="Monto $" min="0.01" step="0.01"
                        value={pagoForm[s.usuario_id] || ''}
                        onChange={e => setPagoForm({ ...pagoForm, [s.usuario_id]: e.target.value })}
                      />
                      <button style={{ ...styles.btnAgregar, padding: '8px 12px', fontSize: 12 }} onClick={() => registrarPagoLibre(s.usuario_id, pagoForm[s.usuario_id])}>
                        Pago parcial
                      </button>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {/* TAB PERFIL */}
        {tab === 'perfil' && (
          <div style={styles.perfilContainer}>
            <div style={styles.avatarSeccion}>
              <div style={styles.avatar}>
                <span style={styles.avatarLetra}>{usuario.nombre?.charAt(0).toUpperCase()}</span>
              </div>
              <h3 style={styles.nombre}>{usuario.nombre} {usuario.apellido}</h3>
              <div style={styles.rolBadge}>
                <span>⚙️</span>
                <span>Administrador</span>
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardHeaderRow}>
                <div>
                  <p style={styles.cardTitulo}>Datos personales</p>
                  <p style={styles.cardSubtitulo}>Tu información básica</p>
                </div>
                {!editandoPerfil && <button style={styles.btnEditar} onClick={() => setEditandoPerfil(true)}>Editar</button>}
              </div>
              {editandoPerfil ? (
                <div style={styles.formGroup}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Nombre</label>
                    <input style={styles.input} placeholder="Nombre" value={perfilForm.nombre} onChange={e => setPerfilForm({ ...perfilForm, nombre: e.target.value })} />
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Apellido</label>
                    <input style={styles.input} placeholder="Apellido" value={perfilForm.apellido} onChange={e => setPerfilForm({ ...perfilForm, apellido: e.target.value })} />
                  </div>
                  <div style={styles.infoBoxNoEditable}>
                    <p style={styles.infoBoxLabel}>Correo (no editable)</p>
                    <p style={styles.infoBoxValor}>{usuario.correo}</p>
                  </div>
                  <div style={styles.botonesRow}>
                    <button style={styles.btnGuardar} onClick={guardarPerfilAdmin}>Guardar</button>
                    <button style={styles.btnCancelar} onClick={() => { setEditandoPerfil(false); setPerfilForm({ nombre: usuario.nombre, apellido: usuario.apellido }); }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div style={styles.infoLista2}>
                  <div style={styles.infoRow2}>
                    <span style={styles.infoLabel2}>Nombre</span>
                    <span style={styles.infoValor2}>{usuario.nombre}</span>
                  </div>
                  <div style={styles.infoRow2}>
                    <span style={styles.infoLabel2}>Apellido</span>
                    <span style={styles.infoValor2}>{usuario.apellido}</span>
                  </div>
                  <div style={styles.infoRow2}>
                    <span style={styles.infoLabel2}>Correo</span>
                    <span style={styles.infoValor2Pequeno}>{usuario.correo}</span>
                  </div>
                  <div style={{ ...styles.infoRow2, borderBottom: 'none' }}>
                    <span style={styles.infoLabel2}>Lugar</span>
                    <span style={styles.infoValor2}>{lugar.nombre}</span>
                  </div>
                </div>
              )}
            </div>

            <div style={styles.card}>
              <div style={styles.cardHeaderRow}>
                <div>
                  <p style={styles.cardTitulo}>Seguridad</p>
                  <p style={styles.cardSubtitulo}>Contraseña de acceso</p>
                </div>
                {!editandoPassAdmin && <button style={styles.btnEditar} onClick={() => setEditandoPassAdmin(true)}>Cambiar</button>}
              </div>
              {editandoPassAdmin ? (
                <div style={styles.formGroup}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Contraseña actual</label>
                    <input style={styles.input} type="password" placeholder="••••••••" value={passFormAdmin.actual} onChange={e => setPassFormAdmin({ ...passFormAdmin, actual: e.target.value })} />
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Nueva contraseña</label>
                    <input style={styles.input} type="password" placeholder="••••••••" value={passFormAdmin.nueva} onChange={e => setPassFormAdmin({ ...passFormAdmin, nueva: e.target.value })} />
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Confirmar nueva contraseña</label>
                    <input style={styles.input} type="password" placeholder="••••••••" value={passFormAdmin.confirmar} onChange={e => setPassFormAdmin({ ...passFormAdmin, confirmar: e.target.value })} />
                    <p style={styles.hint}>Letras y números, mínimo 6 caracteres</p>
                  </div>
                  <div style={styles.botonesRow}>
                    <button style={styles.btnGuardar} onClick={cambiarPasswordAdmin}>Guardar</button>
                    <button style={styles.btnCancelar} onClick={() => { setEditandoPassAdmin(false); setPassFormAdmin({ actual: '', nueva: '', confirmar: '' }); }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div style={styles.passDisplay}>
                  <span style={styles.passDots}>••••••••</span>
                </div>
              )}
            </div>
          </div>
        )}
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
  header: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    padding: '18px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerSubtitulo: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: 500,
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  headerTitulo: {
    fontSize: 20,
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '-0.02em',
  },
  headerAcciones: {
    display: 'flex',
    gap: 8,
  },
  iconBtnDark: {
    width: 40,
    height: 40,
    borderRadius: 'var(--radius-full)',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#fff',
    fontSize: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  btnSalir: {
    width: 40,
    height: 40,
    background: 'rgba(239, 68, 68, 0.2)',
    color: '#fff',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: 'var(--radius-full)',
    fontSize: 16,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    display: 'flex',
    background: 'var(--bg-card)',
    padding: '8px 8px 0',
    gap: 4,
    borderBottom: '1px solid var(--border-suave)',
    overflowX: 'auto',
    scrollbarWidth: 'none',
  },
  tab: {
    flex: 1,
    minWidth: 70,
    padding: '10px 6px',
    border: 'none',
    background: 'transparent',
    fontSize: 12,
    color: 'var(--text-suave)',
    fontWeight: 600,
    cursor: 'pointer',
    borderBottom: '2.5px solid transparent',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    transition: 'all 0.2s ease',
  },
  tabActivo: {
    color: 'var(--color-primario)',
    borderBottomColor: 'var(--color-primario)',
  },
  tabIcon: {
    fontSize: 16,
  },
  tabLabel: {
    fontSize: 11,
  },
  mensajeGlobal: {
    padding: '10px 16px',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: 600,
    background: 'rgba(16, 185, 129, 0.1)',
    color: 'var(--color-exito)',
    borderBottom: '1px solid rgba(16, 185, 129, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mensajeIcon: {
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: '20px 18px 40px',
  },
  tabContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  carruselContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: '16/10',
    maxHeight: 280,
    background: '#000',
    borderRadius: 'var(--radius-lg)',
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
    width: 36,
    height: 36,
    fontSize: 20,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carruselIndicadores: {
    position: 'absolute',
    bottom: 12,
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
    paddingBottom: 4,
    overflowX: 'auto',
    scrollbarWidth: 'none',
  },
  miniatura: {
    width: 56,
    height: 56,
    objectFit: 'cover',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all 0.2s ease',
  },
  sinFotos: {
    width: '100%',
    height: 180,
    background: 'var(--bg-card)',
    border: '1px dashed var(--border-medio)',
    borderRadius: 'var(--radius-lg)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    color: 'var(--text-suave)',
    fontSize: 14,
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
  cardHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardTitulo: {
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--text-principal)',
    letterSpacing: '-0.01em',
  },
  cardTituloGrande: {
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--text-principal)',
    letterSpacing: '-0.02em',
    marginBottom: 4,
  },
  cardSubtitulo: {
    fontSize: 12,
    color: 'var(--text-suave)',
    marginTop: 2,
  },
  cardSub: {
    fontSize: 13,
    color: 'var(--text-secundario)',
    lineHeight: 1.5,
  },
  cardIcono: {
    width: 40,
    height: 40,
    borderRadius: 'var(--radius-full)',
    background: 'linear-gradient(135deg, var(--color-primario) 0%, var(--color-primario-hover) 100%)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 16,
    flexShrink: 0,
    boxShadow: '0 4px 8px rgba(79, 70, 229, 0.2)',
  },
  categoriaBadge: {
    display: 'inline-block',
    background: 'var(--color-primario-suave)',
    color: 'var(--color-primario)',
    border: '1px solid var(--color-primario-borde)',
    fontSize: 11,
    fontWeight: 700,
    padding: '4px 10px',
    borderRadius: 'var(--radius-full)',
    textTransform: 'capitalize',
  },
  infoLista: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginTop: 4,
  },
  infoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 0',
  },
  infoIcon: {
    fontSize: 14,
    width: 24,
    textAlign: 'center',
  },
  infoTexto: {
    fontSize: 13,
    color: 'var(--text-secundario)',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  inputsRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
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
  inputSmall: {
    padding: '9px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1.5px solid var(--border-suave)',
    background: 'var(--bg-input)',
    color: 'var(--text-principal)',
    fontSize: 13,
    flex: 1,
    minWidth: 80,
  },
  textarea: {
    padding: '11px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1.5px solid var(--border-suave)',
    background: 'var(--bg-input)',
    color: 'var(--text-principal)',
    fontSize: 14,
    minHeight: 80,
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  hint: {
    fontSize: 11,
    color: 'var(--text-suave)',
    textAlign: 'center',
  },
  botonesRow: {
    display: 'flex',
    gap: 8,
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
  btnGuardarSmall: {
    padding: '7px 11px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'rgba(16, 185, 129, 0.15)',
    color: 'var(--color-exito)',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 12,
  },
  btnCancelarSmall: {
    padding: '7px 11px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'rgba(239, 68, 68, 0.15)',
    color: 'var(--color-error)',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 12,
  },
  btnAgregar: {
    padding: '11px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'var(--color-primario)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnAprobar: {
    padding: '8px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    background: 'rgba(16, 185, 129, 0.1)',
    color: 'var(--color-exito)',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 12,
    flex: 1,
  },
  btnRechazar: {
    padding: '8px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    background: 'rgba(239, 68, 68, 0.1)',
    color: 'var(--color-error)',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 12,
    flex: 1,
  },
  btnPeligro: {
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    background: 'rgba(239, 68, 68, 0.1)',
    color: 'var(--color-error)',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 13,
    flex: 1,
  },
  btnAprobarPeq: {
    padding: '6px 12px',
    borderRadius: 'var(--radius-full)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    background: 'rgba(16, 185, 129, 0.1)',
    color: 'var(--color-exito)',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 11,
  },
  btnRechazarPeq: {
    padding: '6px 12px',
    borderRadius: 'var(--radius-full)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    background: 'rgba(239, 68, 68, 0.1)',
    color: 'var(--color-error)',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 11,
  },
  acciones: {
    display: 'flex',
    gap: 8,
    marginTop: 4,
  },
  diaCard: {
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    border: '1px solid var(--border-suave)',
    boxShadow: 'var(--shadow-sm)',
  },
  diaHeader: {
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    cursor: 'pointer',
    transition: 'background 0.2s ease',
  },
  diaNombreWrap: {
    display: 'flex',
    flexDirection: 'column',
    width: 90,
    flexShrink: 0,
  },
  diaNombre: {
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--text-principal)',
    letterSpacing: '-0.01em',
  },
  diaFecha: {
    fontSize: 11,
    color: 'var(--text-suave)',
    fontWeight: 500,
    marginTop: 2,
  },
  horariosResumen: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  horarioBadge: {
    background: 'var(--color-primario-suave)',
    color: 'var(--color-primario)',
    border: '1px solid var(--color-primario-borde)',
    fontSize: 11,
    fontWeight: 700,
    padding: '4px 9px',
    borderRadius: 'var(--radius-full)',
  },
  cerradoBadge: {
    background: 'var(--bg-hover)',
    color: 'var(--text-suave)',
    fontSize: 11,
    fontWeight: 600,
    padding: '4px 9px',
    borderRadius: 'var(--radius-full)',
    border: '1px solid var(--border-suave)',
  },
  chevron: {
    marginLeft: 'auto',
    color: 'var(--text-suave)',
    fontSize: 11,
  },
  diaDetalle: {
    borderTop: '1px solid var(--border-suave)',
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  horarioRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'var(--bg-hover)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 12px',
    flexWrap: 'wrap',
  },
  horarioRowConBoton: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  btnVerInscritos: {
    background: 'var(--color-primario-suave)',
    border: '1px solid var(--color-primario-borde)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 12px',
    color: 'var(--color-primario)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center',
  },
  editRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    background: 'rgba(245, 158, 11, 0.08)',
    border: '1px solid rgba(245, 158, 11, 0.2)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 12px',
  },
  horarioTexto: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--color-primario)',
    flex: 1,
  },
  cuposTexto: {
    fontSize: 12,
    color: 'var(--text-secundario)',
  },
  btnEditarHorario: {
    padding: '6px 11px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-primario-borde)',
    background: 'var(--color-primario-suave)',
    color: 'var(--color-primario)',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 11,
  },
  btnEliminarHorario: {
    padding: '6px 11px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    background: 'rgba(239, 68, 68, 0.1)',
    color: 'var(--color-error)',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 11,
  },
  btnCopiar: {
    background: 'var(--color-primario-suave)',
    border: '1px dashed var(--color-primario)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px',
    color: 'var(--color-primario)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center',
  },
  agregarHorario: {
    background: 'var(--color-primario-suave)',
    border: '1px solid var(--color-primario-borde)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  agregarTitulo: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--color-primario)',
  },
  motivoBox: {
    borderRadius: 'var(--radius-sm)',
    padding: '10px 12px',
    fontSize: 12,
    fontWeight: 600,
  },
  searchBoxAdmin: {
    display: 'flex',
    alignItems: 'center',
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-md)',
    padding: '10px 14px',
    border: '1px solid var(--border-suave)',
    boxShadow: 'var(--shadow-sm)',
    gap: 10,
  },
  searchInputAdmin: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: 13,
    color: 'var(--text-principal)',
    background: 'transparent',
  },
  clearBtnAdmin: {
    background: 'var(--bg-hover)',
    border: 'none',
    color: 'var(--text-suave)',
    cursor: 'pointer',
    fontSize: 11,
    width: 22,
    height: 22,
    borderRadius: 'var(--radius-full)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vacio: {
    textAlign: 'center',
    padding: '40px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    background: 'var(--bg-card)',
    border: '1px solid var(--border-suave)',
    borderRadius: 'var(--radius-lg)',
  },
  vacioIcon: {
    fontSize: 48,
    opacity: 0.5,
  },
  vacioTexto: {
    fontSize: 14,
    color: 'var(--text-secundario)',
  },
  vacioTextoCentrado: {
    fontSize: 13,
    color: 'var(--text-suave)',
    textAlign: 'center',
    padding: '16px 0',
  },
  badge: {
    alignSelf: 'flex-start',
    padding: '5px 11px',
    borderRadius: 'var(--radius-full)',
    fontSize: 11,
    fontWeight: 700,
    border: '1px solid',
    textTransform: 'capitalize',
  },
  btnEspecial: {
    background: 'rgba(245, 158, 11, 0.1)',
    border: '1px dashed var(--color-advertencia)',
    borderRadius: 'var(--radius-md)',
    padding: '14px',
    color: 'var(--color-advertencia)',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    textAlign: 'center',
  },
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
    gap: 12,
    border: '1px solid var(--border-suave)',
    boxShadow: 'var(--shadow-lg)',
  },
  modalIconWarn: {
    width: 48,
    height: 48,
    borderRadius: 'var(--radius-full)',
    background: 'rgba(239, 68, 68, 0.1)',
    color: 'var(--color-error)',
    fontSize: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
  },
  modalHeaderInscritos: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    paddingBottom: 8,
    borderBottom: '1px solid var(--border-suave)',
  },
  btnCerrarModal: {
    background: 'var(--bg-hover)',
    border: '1px solid var(--border-suave)',
    color: 'var(--text-secundario)',
    fontSize: 14,
    fontWeight: 700,
    width: 32,
    height: 32,
    borderRadius: 'var(--radius-full)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  contadorInscritos: {
    background: 'var(--color-primario-suave)',
    border: '1px solid var(--color-primario-borde)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  contadorNumero: {
    fontSize: 28,
    fontWeight: 700,
    color: 'var(--color-primario)',
    letterSpacing: '-0.02em',
  },
  contadorTexto: {
    fontSize: 12,
    color: 'var(--text-secundario)',
    fontWeight: 500,
  },
  listaInscritos: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    maxHeight: 300,
    overflowY: 'auto',
  },
  diaBadge: {
    padding: '10px 16px',
    borderRadius: 'var(--radius-full)',
    border: '1px solid',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    transition: 'all 0.2s ease',
  },
  tipoEspecialRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  horarioEspecialItem: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
    flexWrap: 'wrap',
    background: 'var(--bg-hover)',
    border: '1px solid var(--border-suave)',
    padding: 10,
    borderRadius: 'var(--radius-sm)',
  },
  checkboxLista: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginBottom: 4,
  },
  checkboxItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    cursor: 'pointer',
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid',
    transition: 'all 0.2s ease',
  },
  diasGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  errorTexto: {
    fontSize: 12,
    color: 'var(--color-error)',
    fontWeight: 600,
    textAlign: 'center',
    padding: '8px 0',
  },
  exitoTexto: {
    fontSize: 12,
    color: 'var(--color-exito)',
    fontWeight: 600,
    textAlign: 'center',
    padding: '4px 0',
  },
  exitoBox: {
    background: 'rgba(16, 185, 129, 0.1)',
    color: 'var(--color-exito)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px',
    fontSize: 13,
    fontWeight: 600,
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  excepcionCard: {
    borderRadius: 'var(--radius-sm)',
    padding: '12px',
    border: '1px solid',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  excepcionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  excepcionFecha: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text-principal)',
    textTransform: 'capitalize',
  },
  excepcionHorarios: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  excepcionMotivo: {
    fontSize: 11,
    color: 'var(--text-suave)',
    fontStyle: 'italic',
  },
  galeriaSeccion: {
    borderTop: '1px solid var(--border-suave)',
    paddingTop: 14,
    marginTop: 4,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  galeriaTitulo: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text-principal)',
  },
  galeriaSubtitulo: {
    fontSize: 12,
    color: 'var(--text-secundario)',
  },
  galeriaVacia: {
    fontSize: 12,
    color: 'var(--text-suave)',
    textAlign: 'center',
    padding: '8px 0',
  },
  galeriaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
    gap: 8,
    marginTop: 4,
  },
  galeriaFotoItem: {
    position: 'relative',
    borderRadius: 'var(--radius-sm)',
    overflow: 'hidden',
    aspectRatio: '1',
    background: 'var(--bg-hover)',
    border: '1px solid var(--border-suave)',
  },
  btnEliminarFoto: {
    position: 'absolute',
    top: 4,
    right: 4,
    background: 'rgba(239, 68, 68, 0.9)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-full)',
    width: 22,
    height: 22,
    cursor: 'pointer',
    fontSize: 10,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  horarioActivoHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
  },
  horarioActivoBotones: {
    display: 'flex',
    gap: 6,
  },
  personaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: 'var(--bg-hover)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 12px',
    flexWrap: 'wrap',
  },
  saldoCard: {
    background: 'rgba(239, 68, 68, 0.05)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    border: '1px solid rgba(239, 68, 68, 0.15)',
  },
  saldoCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  pagoParcialRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  perfilContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    alignItems: 'center',
  },
  avatarSeccion: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 'var(--radius-full)',
    background: 'linear-gradient(135deg, var(--color-primario) 0%, var(--color-primario-hover) 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 10px 30px rgba(79, 70, 229, 0.35)',
  },
  avatarLetra: {
    fontSize: 38,
    color: '#fff',
    fontWeight: 700,
    letterSpacing: '-0.02em',
  },
  nombre: {
    fontSize: 20,
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
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--color-primario)',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  infoBoxNoEditable: {
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
  infoLista2: {
    display: 'flex',
    flexDirection: 'column',
  },
  infoRow2: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--border-suave)',
    padding: '11px 0',
  },
  infoLabel2: {
    fontSize: 13,
    color: 'var(--text-secundario)',
  },
  infoValor2: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-principal)',
  },
  infoValor2Pequeno: {
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
