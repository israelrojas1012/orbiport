import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useTheme } from '../context/ThemeContext';
import TerminosModal from '../components/TerminosModal';
import ConfirmarSalida from '../components/ConfirmarSalida';
import AdminPerfil from './admin/AdminPerfil';
import AdminInfo from './admin/AdminInfo';
import AdminHorarios from './admin/AdminHorarios';
import AdminInscripciones from './admin/AdminInscripciones';
import AdminAsistencias from './admin/AdminAsistencias';
import adminStyles from '../styles/adminStyles';



const styles = adminStyles;

const formatHora = (hora) => {
  if (!hora) return '';
  const [h, m] = hora.slice(0, 5).split(':');
  const hNum = parseInt(h);
  const ampm = hNum >= 12 ? 'PM' : 'AM';
  const h12 = hNum % 12 || 12;
  return `${h12}:${m} ${ampm}`;
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
  const [tab, setTab] = useState('info');
  const [mensaje, setMensaje] = useState('');
  const mostrarMensaje = (texto) => {
    setMensaje(texto);
    setTimeout(() => setMensaje(''), 3000);
  };
  
  const { tema, cambiarTema } = useTheme();
  const [modalTerminosAdmin, setModalTerminosAdmin] = useState(false);
  const [forzarTerminos, setForzarTerminos] = useState(false);
  const [modalInscritos, setModalInscritos] = useState(null);
  const [personasInscritas, setPersonasInscritas] = useState([]);
  const [fechaInscritos, setFechaInscritos] = useState('');
  const [confirmarSalida, setConfirmarSalida] = useState(false);

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
      
    }).catch(() => {});
  }, []);



  const cerrarSesion = () => { localStorage.clear(); navigate('/'); };


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
      {/* MODAL CONFIRMAR SALIDA */}
      <ConfirmarSalida
        abierto={confirmarSalida}
        onCancelar={() => setConfirmarSalida(false)}
        onConfirmar={cerrarSesion}
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

    

      <div style={styles.content}>
        {/* TAB INFO */}
        {tab === 'info' && (
          <div style={styles.tabContent}>
            <AdminInfo
              lugar={lugar}
              setLugar={setLugar}
              mostrarMensaje={mostrarMensaje}
              styles={styles}
            />
          </div>
        )}

        {/* TAB HORARIOS */}
        {tab === 'horarios' && (
          <div style={styles.tabContent}>
            <AdminHorarios
              lugar={lugar}
              mostrarMensaje={mostrarMensaje}
              styles={styles}
              onVerInscritos={(h, fecha) => {
                setFechaInscritos(fecha);
                verInscritosAdmin(h, fecha);
              }}
            />
          </div>
        )}

        {tab === 'inscripciones' && (
          <AdminInscripciones
            lugar={lugar}
            mostrarMensaje={mostrarMensaje}
            styles={styles}
          />
        )}

        {/* TAB ASISTENCIA */}
        {tab === 'asistencia' && (
          <AdminAsistencias
            lugar={lugar}
            mostrarMensaje={mostrarMensaje}
            styles={styles}
          />
        )}

        {/* TAB PERFIL */}
        {tab === 'perfil' && (
          <AdminPerfil
            usuario={usuario}
            lugar={lugar}
            mostrarMensaje={mostrarMensaje}
            styles={styles}
          />
        )}
        
      </div>
    </div>
  );
}