import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import API from '../services/api';

export default function MiProgreso() {
  const navigate = useNavigate();
  const location = useLocation();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

  const [vista, setVista] = useState('inicio');
  const [ejercicios, setEjercicios] = useState([]);
  const [progresos, setProgresos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('Todos');
  const [ejercicioSeleccionado, setEjercicioSeleccionado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState(null);

  const [form, setForm] = useState({
    peso: '',
    unidad_peso: 'kg',
    repeticiones: '',
    distancia: '',
    unidad_distancia: 'm',
    minutos: '',
    segundos: ''
  });

  const categorias = [
    'Todos',
    'Con peso',
    'Peso corporal',
    'Máquinas',
    'Cardio',
    'Otros'
  ];

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setCargando(true);

      const [resEjercicios, resProgresos] = await Promise.all([
        API.get('/progreso/ejercicios'),
        API.get(`/progreso/usuario/${usuario.id}`)
      ]);

      setEjercicios(resEjercicios.data);
      setProgresos(resProgresos.data);
    } catch (err) {
      mostrarToast('Error al cargar Mi Progreso', 'error');
    } finally {
      setCargando(false);
    }
  };

  const mostrarToast = (msg, tipo = 'exito') => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3000);
  };

  const normalizarTexto = texto =>
    String(texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  const ejerciciosFiltrados = useMemo(() => {
    const texto = normalizarTexto(busqueda);

    return ejercicios
      .filter(e => categoria === 'Todos' || e.categoria === categoria)
      .filter(e => {
        if (!texto) return true;

        return [
          e.nombre,
          e.nombre_es,
          e.alias_busqueda
        ].some(valor =>
          normalizarTexto(valor).includes(texto)
        );
      })
      .sort((a, b) =>
        (a.nombre_es || a.nombre).localeCompare(
          b.nombre_es || b.nombre,
          'es'
        )
      );
  }, [ejercicios, busqueda, categoria]);

  const progresosAgrupados = useMemo(() => {
    const grupos = {};

    progresos.forEach(p => {
      if (!grupos[p.ejercicio_id]) {
        grupos[p.ejercicio_id] = {
          ejercicio_id: p.ejercicio_id,
          ejercicio: p.ejercicio,
          ejercicio_es: p.ejercicio_es,
          categoria: p.categoria,
          registros: []
        };
      }

      grupos[p.ejercicio_id].registros.push(p);
    });

    return Object.values(grupos).sort((a, b) =>
      (a.ejercicio_es || a.ejercicio).localeCompare(
        b.ejercicio_es || b.ejercicio,
        'es'
      )
    );
  }, [progresos]);

  const seleccionarEjercicio = ejercicio => {
    setEjercicioSeleccionado(ejercicio);
    setForm({
      peso: '',
      unidad_peso: 'kg',
      repeticiones: '',
      distancia: '',
      unidad_distancia: 'm',
      minutos: '',
      segundos: ''
    });
    setVista('registro');
  };

  const guardarProgreso = async () => {
    const minutos = form.minutos === '' ? 0 : Number(form.minutos);
    const segundos = form.segundos === '' ? 0 : Number(form.segundos);

    if (
      minutos < 0 ||
      segundos < 0 ||
      segundos > 59
    ) {
      mostrarToast('Revisa el tiempo ingresado', 'error');
      return;
    }

    const tieneTiempo =
      form.minutos !== '' || form.segundos !== '';

    const tiempoSegundos = tieneTiempo
      ? (minutos * 60) + segundos
      : null;

    if (
      form.peso === '' &&
      form.repeticiones === '' &&
      form.distancia === '' &&
      tiempoSegundos === null
    ) {
      mostrarToast('Registra al menos un dato', 'error');
      return;
    }

    try {
      setGuardando(true);

      await API.post('/progreso', {
        usuario_id: usuario.id,
        ejercicio_id: ejercicioSeleccionado.id,
        peso: form.peso,
        unidad_peso: form.peso === '' ? null : form.unidad_peso,
        repeticiones: form.repeticiones,
        distancia: form.distancia,
        unidad_distancia:
          form.distancia === '' ? null : form.unidad_distancia,
        tiempo_segundos: tiempoSegundos
      });

      await cargarDatos();

      mostrarToast('Progreso registrado correctamente');
      setEjercicioSeleccionado(null);
      setVista('progreso');
    } catch (err) {
      mostrarToast(
        err.response?.data?.error || 'Error al registrar progreso',
        'error'
      );
    } finally {
      setGuardando(false);
    }
  };

  const eliminarRegistro = async id => {
    const confirmar = window.confirm(
      '¿Seguro que deseas eliminar este registro?'
    );

    if (!confirmar) return;

    try {
      await API.delete(`/progreso/${id}`, {
        data: {
          usuario_id: usuario.id
        }
      });

      setProgresos(prev =>
        prev.filter(p => p.id !== id)
      );

      mostrarToast('Registro eliminado correctamente');
    } catch (err) {
      mostrarToast(
        err.response?.data?.error || 'Error al eliminar registro',
        'error'
      );
    }
  };

  const formatearFecha = fecha =>
    new Intl.DateTimeFormat('es-EC', {
      timeZone: 'America/Guayaquil',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(fecha));

  const formatearTiempo = segundos => {
    if (segundos === null || segundos === undefined) return null;

    const minutos = Math.floor(Number(segundos) / 60);
    const resto = Number(segundos) % 60;

    if (minutos === 0) return `${resto}s`;
    if (resto === 0) return `${minutos} min`;

    return `${minutos} min ${resto}s`;
  };

  const descripcionRegistro = registro => {
    const datos = [];

    if (registro.peso !== null) {
      datos.push(
        `${Number(registro.peso)} ${registro.unidad_peso}`
      );
    }

    if (registro.repeticiones !== null) {
      datos.push(
        `${registro.repeticiones} rep${Number(registro.repeticiones) !== 1 ? 's' : ''}`
      );
    }

    if (registro.distancia !== null) {
      datos.push(
        `${Number(registro.distancia)} ${registro.unidad_distancia}`
      );
    }

    if (registro.tiempo_segundos !== null) {
      datos.push(formatearTiempo(registro.tiempo_segundos));
    }

    return datos.join(' · ');
  };

  if (cargando) {
    return (
      <div style={styles.cargando}>
        Cargando Mi Progreso...
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {toast && (
        <div
          style={{
            ...styles.toast,
            background:
              toast.tipo === 'error'
                ? 'var(--color-error)'
                : 'var(--color-exito)'
          }}
        >
          {toast.tipo === 'error' ? '⚠' : '✓'} {toast.msg}
        </div>
      )}

      <div style={styles.header}>
        <p style={styles.headerSubtitulo}>Entrenamiento</p>
        <h2 style={styles.headerTitulo}>Mi Progreso</h2>
      </div>

      <div style={styles.content}>
        {vista === 'inicio' && (
          <>
            <button
              style={styles.opcion}
              onClick={() => setVista('progreso')}
            >
              <span style={styles.opcionIcono}>📈</span>

              <div>
                <strong style={styles.opcionTitulo}>
                  Mi progreso
                </strong>

                <p style={styles.opcionTexto}>
                  Consulta todos tus registros
                </p>
              </div>
            </button>

            <button
              style={styles.opcion}
              onClick={() => setVista('ejercicios')}
            >
              <span style={styles.opcionIcono}>➕</span>

              <div>
                <strong style={styles.opcionTitulo}>
                  Agregar progreso
                </strong>

                <p style={styles.opcionTexto}>
                  Registra un nuevo entrenamiento
                </p>
              </div>
            </button>
          </>
        )}

        {vista === 'progreso' && (
          <>
            <button
              style={styles.volver}
              onClick={() => setVista('inicio')}
            >
              ← Volver
            </button>

            <h3 style={styles.tituloSeccion}>Mi progreso</h3>

            {progresosAgrupados.length === 0 ? (
              <div style={styles.vacio}>
                <div style={{ fontSize: 42 }}>📊</div>

                <strong>
                  No has registrado ningún progreso
                </strong>

                <p style={styles.vacioTexto}>
                  Agrega tu primer registro para comenzar.
                </p>

                <button
                  style={styles.btnPrincipal}
                  onClick={() => setVista('ejercicios')}
                >
                  Agregar progreso
                </button>
              </div>
            ) : (
              progresosAgrupados.map(grupo => (
                <div
                  key={grupo.ejercicio_id}
                  style={styles.card}
                >
                  <div style={styles.cardHeader}>
                    <div>
                      <strong style={styles.nombreEjercicio}>
                        {grupo.ejercicio_es || grupo.ejercicio}
                      </strong>

                      {grupo.ejercicio_es && (
                        <p style={styles.nombreIngles}>
                          {grupo.ejercicio}
                        </p>
                      )}

                      <span style={styles.categoria}>
                        {grupo.categoria}
                      </span>
                    </div>

                    <button
                      style={styles.btnAgregarPequeno}
                      onClick={() => {
                        const ejercicio = ejercicios.find(
                          e => e.id === grupo.ejercicio_id
                        );

                        if (ejercicio) {
                          seleccionarEjercicio(ejercicio);
                        }
                      }}
                    >
                      + Registro
                    </button>
                  </div>

                  <div style={styles.historial}>
                    {grupo.registros.map(registro => (
                      <div
                        key={registro.id}
                        style={styles.registro}
                      >
                        <div>
                          <strong style={styles.registroDatos}>
                            {descripcionRegistro(registro)}
                          </strong>

                          <p style={styles.registroFecha}>
                            {formatearFecha(registro.creado_en)}
                          </p>
                        </div>

                        <button
                          style={styles.btnEliminar}
                          onClick={() =>
                            eliminarRegistro(registro.id)
                          }
                          aria-label="Eliminar registro"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {vista === 'ejercicios' && (
          <>
            <button
              style={styles.volver}
              onClick={() => setVista('inicio')}
            >
              ← Volver
            </button>

            <h3 style={styles.tituloSeccion}>
              Elige tu ejercicio para registrar
            </h3>

            <input
              style={styles.buscar}
              placeholder="Buscar ejercicio..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />

            <div style={styles.categorias}>
              {categorias.map(cat => (
                <button
                  key={cat}
                  style={{
                    ...styles.categoriaBtn,
                    ...(categoria === cat
                      ? styles.categoriaBtnActivo
                      : {})
                  }}
                  onClick={() => setCategoria(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div style={styles.listaEjercicios}>
              {ejerciciosFiltrados.map(ejercicio => (
                <button
                  key={ejercicio.id}
                  style={styles.ejercicioBtn}
                  onClick={() =>
                    seleccionarEjercicio(ejercicio)
                  }
                >
                  <div>
                    <strong>
                      {ejercicio.nombre_es || ejercicio.nombre}
                    </strong>

                    {ejercicio.nombre_es && (
                      <p style={styles.nombreIngles}>
                        {ejercicio.nombre}
                      </p>
                    )}
                  </div>

                  <span>›</span>
                </button>
              ))}
            </div>
          </>
        )}

        {vista === 'registro' && ejercicioSeleccionado && (
          <>
            <button
              style={styles.volver}
              onClick={() => setVista('ejercicios')}
            >
              ← Volver
            </button>

            <div style={styles.card}>
              <span style={styles.categoria}>
                {ejercicioSeleccionado.categoria}
              </span>

              <h3 style={styles.registroTitulo}>
                {ejercicioSeleccionado.nombre_es ||
                  ejercicioSeleccionado.nombre}
              </h3>

              {ejercicioSeleccionado.nombre_es && (
                <p style={styles.nombreIngles}>
                  {ejercicioSeleccionado.nombre}
                </p>
              )}

              <div style={styles.form}>
                <label style={styles.label}>Peso</label>

                <div style={styles.fila}>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    style={styles.input}
                    placeholder="Opcional"
                    value={form.peso}
                    onChange={e =>
                      setForm({
                        ...form,
                        peso: e.target.value
                      })
                    }
                  />

                  <select
                    style={styles.select}
                    value={form.unidad_peso}
                    onChange={e =>
                      setForm({
                        ...form,
                        unidad_peso: e.target.value
                      })
                    }
                  >
                    <option value="kg">kg</option>
                    <option value="lb">lb</option>
                  </select>
                </div>

                <label style={styles.label}>Repeticiones</label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  style={styles.inputCompleto}
                  placeholder="Opcional"
                  value={form.repeticiones}
                  onChange={e =>
                    setForm({
                      ...form,
                      repeticiones: e.target.value
                    })
                  }
                />

                <label style={styles.label}>Distancia</label>

                <div style={styles.fila}>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    style={styles.input}
                    placeholder="Opcional"
                    value={form.distancia}
                    onChange={e =>
                      setForm({
                        ...form,
                        distancia: e.target.value
                      })
                    }
                  />

                  <select
                    style={styles.select}
                    value={form.unidad_distancia}
                    onChange={e =>
                      setForm({
                        ...form,
                        unidad_distancia: e.target.value
                      })
                    }
                  >
                    <option value="m">m</option>
                    <option value="km">km</option>
                  </select>
                </div>

                <label style={styles.label}>Tiempo</label>

                <div style={styles.fila}>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    style={styles.input}
                    placeholder="Minutos"
                    value={form.minutos}
                    onChange={e =>
                      setForm({
                        ...form,
                        minutos: e.target.value
                      })
                    }
                  />

                  <input
                    type="number"
                    min="0"
                    max="59"
                    step="1"
                    style={styles.input}
                    placeholder="Segundos"
                    value={form.segundos}
                    onChange={e =>
                      setForm({
                        ...form,
                        segundos: e.target.value
                      })
                    }
                  />
                </div>

                <button
                  style={styles.btnPrincipal}
                  onClick={guardarProgreso}
                  disabled={guardando}
                >
                  {guardando
                    ? 'Guardando...'
                    : 'Guardar progreso'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div style={styles.navbar}>
        <button
          style={styles.navBtn}
          onClick={() => navigate('/home')}
        >
          <span style={styles.navIcon}>🏠</span>
          <span style={styles.navLabel}>Inicio</span>
        </button>

        <button
          style={{
            ...styles.navBtn,
            color:
              location.pathname === '/perfil'
                ? 'var(--color-primario)'
                : 'var(--text-suave)'
          }}
          onClick={() => navigate('/perfil')}
        >
          <span style={styles.navIcon}>👤</span>
          <span style={styles.navLabel}>Perfil</span>
        </button>

        <button
          style={{
            ...styles.navBtn,
            color: 'var(--color-primario)',
            background: 'var(--color-primario-suave)'
          }}
        >
          <span style={styles.navIcon}>📈</span>
          <span style={styles.navLabel}>Mi Progreso</span>
        </button>

        <button
          style={styles.navBtn}
          onClick={() => navigate('/mis-reservas')}
        >
          <span style={styles.navIcon}>📅</span>
          <span style={styles.navLabel}>Mis Reservas</span>
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'var(--bg-principal)',
    paddingBottom: 95
  },

  cargando: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-principal)',
    color: 'var(--text-principal)',
    fontWeight: 600
  },

  header: {
    padding: '24px 20px 16px',
    maxWidth: 720,
    margin: '0 auto'
  },

  headerSubtitulo: {
    margin: 0,
    fontSize: 13,
    color: 'var(--text-suave)'
  },

  headerTitulo: {
    margin: '3px 0 0',
    color: 'var(--text-principal)'
  },

  content: {
    maxWidth: 720,
    margin: '0 auto',
    padding: '0 16px 30px'
  },

  opcion: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    textAlign: 'left',
    padding: 20,
    marginBottom: 14,
    borderRadius: 18,
    border: '1px solid var(--border-suave)',
    background: 'var(--bg-card)',
    cursor: 'pointer'
  },

  opcionIcono: {
    fontSize: 30
  },

  opcionTitulo: {
    color: 'var(--text-principal)',
    fontSize: 16
  },

  opcionTexto: {
    margin: '4px 0 0',
    color: 'var(--text-suave)',
    fontSize: 13
  },

  volver: {
    border: 'none',
    background: 'transparent',
    color: 'var(--color-primario)',
    cursor: 'pointer',
    padding: '8px 0',
    marginBottom: 10,
    fontWeight: 600
  },

  tituloSeccion: {
    color: 'var(--text-principal)',
    margin: '0 0 16px'
  },

  vacio: {
    padding: '40px 20px',
    textAlign: 'center',
    borderRadius: 18,
    border: '1px solid var(--border-suave)',
    background: 'var(--bg-card)',
    color: 'var(--text-principal)'
  },

  vacioTexto: {
    color: 'var(--text-suave)',
    fontSize: 14
  },

  card: {
    padding: 18,
    marginBottom: 14,
    borderRadius: 18,
    border: '1px solid var(--border-suave)',
    background: 'var(--bg-card)'
  },

  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12
  },

  nombreEjercicio: {
    color: 'var(--text-principal)',
    fontSize: 16
  },

  nombreIngles: {
    margin: '3px 0 7px',
    color: 'var(--text-suave)',
    fontSize: 12
  },

  categoria: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: 20,
    background: 'var(--color-primario-suave)',
    color: 'var(--color-primario)',
    fontSize: 11,
    fontWeight: 600
  },

  btnAgregarPequeno: {
    border: '1px solid var(--color-primario)',
    borderRadius: 10,
    padding: '7px 10px',
    background: 'transparent',
    color: 'var(--color-primario)',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },

  historial: {
    borderTop: '1px solid var(--border-suave)'
  },

  registro: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '12px 0',
    borderBottom: '1px solid var(--border-suave)'
  },

  registroDatos: {
    color: 'var(--text-principal)',
    fontSize: 14
  },

  registroFecha: {
    margin: '4px 0 0',
    color: 'var(--text-suave)',
    fontSize: 12
  },

  btnEliminar: {
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 17
  },

  buscar: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '13px 14px',
    borderRadius: 12,
    border: '1px solid var(--border-suave)',
    background: 'var(--bg-card)',
    color: 'var(--text-principal)',
    outline: 'none',
    marginBottom: 12
  },

  categorias: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    paddingBottom: 12
  },

  categoriaBtn: {
    border: '1px solid var(--border-suave)',
    borderRadius: 20,
    padding: '7px 11px',
    background: 'var(--bg-card)',
    color: 'var(--text-suave)',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },

  categoriaBtnActivo: {
    background: 'var(--color-primario)',
    color: '#fff',
    borderColor: 'var(--color-primario)'
  },

  listaEjercicios: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },

  ejercicioBtn: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    textAlign: 'left',
    padding: '14px',
    borderRadius: 12,
    border: '1px solid var(--border-suave)',
    background: 'var(--bg-card)',
    color: 'var(--text-principal)',
    cursor: 'pointer'
  },

  registroTitulo: {
    margin: '12px 0 2px',
    color: 'var(--text-principal)'
  },

  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 9,
    marginTop: 20
  },

  label: {
    color: 'var(--text-principal)',
    fontSize: 13,
    fontWeight: 600,
    marginTop: 5
  },

  fila: {
    display: 'flex',
    gap: 8
  },

  input: {
    flex: 1,
    minWidth: 0,
    padding: '12px',
    borderRadius: 10,
    border: '1px solid var(--border-suave)',
    background: 'var(--bg-principal)',
    color: 'var(--text-principal)',
    boxSizing: 'border-box'
  },

  inputCompleto: {
    width: '100%',
    padding: '12px',
    borderRadius: 10,
    border: '1px solid var(--border-suave)',
    background: 'var(--bg-principal)',
    color: 'var(--text-principal)',
    boxSizing: 'border-box'
  },

  select: {
    width: 85,
    padding: '12px 8px',
    borderRadius: 10,
    border: '1px solid var(--border-suave)',
    background: 'var(--bg-principal)',
    color: 'var(--text-principal)'
  },

  btnPrincipal: {
    width: '100%',
    padding: '13px',
    marginTop: 12,
    border: 'none',
    borderRadius: 12,
    background: 'var(--color-primario)',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer'
  },

  toast: {
    position: 'fixed',
    top: 18,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 2000,
    padding: '11px 16px',
    borderRadius: 12,
    color: '#fff',
    fontWeight: 600,
    boxShadow: '0 8px 24px rgba(0,0,0,0.18)'
  },

  navbar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'space-around',
    padding: '8px 6px',
    background: 'var(--bg-card)',
    borderTop: '1px solid var(--border-suave)',
    zIndex: 1000
  },

  navBtn: {
    flex: 1,
    maxWidth: 150,
    border: 'none',
    borderRadius: 12,
    background: 'transparent',
    color: 'var(--text-suave)',
    padding: '7px 3px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3
  },

  navIcon: {
    fontSize: 20
  },

  navLabel: {
    fontSize: 10,
    fontWeight: 600
  }
};