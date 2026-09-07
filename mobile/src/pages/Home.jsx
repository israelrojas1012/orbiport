import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import API from '../services/api';
import { useTheme } from '../context/ThemeContext';

const CATEGORIAS = ['Todos', 'gym', 'crossfit', 'canchas', 'natacion', 'yoga', 'general'];

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const [lugares, setLugares] = useState([]);
  const [filtrados, setFiltrados] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('Todos');
  const [notificaciones, setNotificaciones] = useState([]);
  const [mostrarNotif, setMostrarNotif] = useState(false);
  const { tema, cambiarTema } = useTheme();

  useEffect(() => {
    API.get('/lugares').then(res => {
      setLugares(res.data);
      setFiltrados(res.data);
    }).catch(() => {});
    API.get(`/notificaciones/${usuario.id}`).then(res => setNotificaciones(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    let resultado = lugares;
    if (categoria !== 'Todos') {
      resultado = resultado.filter(l => l.categoria === categoria);
    }
    if (busqueda.trim() !== '') {
      resultado = resultado.filter(l =>
        l.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        l.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) ||
        l.direccion?.toLowerCase().includes(busqueda.toLowerCase())
      );
    }
    setFiltrados(resultado);
  }, [busqueda, categoria, lugares]);

  const noLeidas = notificaciones.filter(n => !n.leida).length;

  const marcarTodasLeidas = async () => {
    await API.put(`/notificaciones/leer/todas/${usuario.id}`);
    setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
  };

  const cerrarSesion = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <p style={styles.saludo}>Hola 👋</p>
          <h2 style={styles.nombreUsuario}>{usuario.nombre}</h2>
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
            onClick={() => { setMostrarNotif(!mostrarNotif); if (!mostrarNotif) marcarTodasLeidas(); }}
            aria-label="Notificaciones"
          >
            🔔
            {noLeidas > 0 && <span style={styles.badge}>{noLeidas}</span>}
          </button>
          <button style={styles.btnSalir} onClick={cerrarSesion} aria-label="Salir">
            ⏻
          </button>
        </div>
      </div>

      {/* PANEL NOTIFICACIONES */}
      {mostrarNotif && (
        <div style={styles.notifPanel}>
          <div style={styles.notifHeader}>
            <p style={styles.notifTitulo}>Notificaciones</p>
            <button style={styles.notifCerrar} onClick={() => setMostrarNotif(false)}>✕</button>
          </div>
          {notificaciones.length === 0 ? (
            <div style={styles.notifVacio}>
              <p style={{ fontSize: 32 }}>🔔</p>
              <p>No tienes notificaciones</p>
            </div>
          ) : (
            <div style={styles.notifLista}>
              {notificaciones.map(n => (
                <div key={n.id} style={{
                  ...styles.notifItem,
                  background: n.leida ? 'var(--bg-card)' : 'var(--color-primario-suave)',
                  borderColor: n.leida ? 'var(--border-suave)' : 'var(--color-primario-borde)'
                }}>
                  {!n.leida && <div style={styles.notifPunto}></div>}
                  <div style={{ flex: 1 }}>
                    <p style={styles.notifMensaje}>{n.mensaje}</p>
                    <p style={styles.notifFecha}>
                      {new Date(n.creado_en).toLocaleDateString('es-EC', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={styles.content}>
        {/* BUSCADOR */}
        <div style={styles.searchBox}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            style={styles.searchInput}
            placeholder="Buscar lugares..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
          {busqueda && (
            <button style={styles.clearBtn} onClick={() => setBusqueda('')}>✕</button>
          )}
        </div>

        {/* FILTROS POR CATEGORIA */}
        <div style={styles.categoriasScroll}>
          {CATEGORIAS.map(cat => {
            const activo = categoria === cat;
            const label = cat === 'Todos' ? '🏠 Todos' :
                          cat === 'gym' ? '💪 Gym' :
                          cat === 'crossfit' ? '🏋️ Crossfit' :
                          cat === 'canchas' ? '⚽ Canchas' :
                          cat === 'natacion' ? '🏊 Natación' :
                          cat === 'yoga' ? '🧘 Yoga' : '📍 General';
            return (
              <button
                key={cat}
                style={{
                  ...styles.catBtn,
                  background: activo ? 'var(--color-primario)' : 'var(--bg-card)',
                  color: activo ? '#fff' : 'var(--text-secundario)',
                  borderColor: activo ? 'var(--color-primario)' : 'var(--border-suave)',
                }}
                onClick={() => setCategoria(cat)}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* RESULTADOS */}
        <div style={styles.tituloRow}>
          <h3 style={styles.titulo}>
            {categoria === 'Todos' ? 'Lugares disponibles' : categoria.charAt(0).toUpperCase() + categoria.slice(1)}
          </h3>
          <span style={styles.contador}>
            {filtrados.length} {filtrados.length === 1 ? 'lugar' : 'lugares'}
          </span>
        </div>

        {filtrados.length === 0 ? (
          <div style={styles.vacio}>
            <div style={styles.vacioIcon}>🔍</div>
            <p style={styles.vacioTexto}>No encontramos lugares con ese criterio.</p>
            <button style={styles.btnLimpiar} onClick={() => { setBusqueda(''); setCategoria('Todos'); }}>
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div style={styles.grid}>
            {filtrados.map(lugar => (
              <div key={lugar.id} style={styles.card} onClick={() => navigate(`/lugar/${lugar.id}`)}>
                <div style={styles.imgWrap}>
                  <img
                    src={lugar.foto_url || 'https://via.placeholder.com/600x300/4f46e5/ffffff?text=Orbiport'}
                    alt={lugar.nombre}
                    style={styles.img}
                  />
                  {lugar.categoria && lugar.categoria !== 'general' && (
                    <span style={styles.categoriaBadge}>{lugar.categoria}</span>
                  )}
                </div>
                <div style={styles.cardBody}>
                  <h4 style={styles.cardTitulo}>{lugar.nombre}</h4>
                  {lugar.descripcion && (
                    <p style={styles.cardDesc}>{lugar.descripcion}</p>
                  )}
                  <div style={styles.cardInfo}>
                    {lugar.direccion && (
                      <div style={styles.cardInfoItem}>
                        <span style={styles.cardInfoIcon}>📍</span>
                        <span>{lugar.direccion}</span>
                      </div>
                    )}
                    {lugar.telefono && (
                      <div style={styles.cardInfoItem}>
                        <span style={styles.cardInfoIcon}>📞</span>
                        <span>{lugar.telefono}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
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
  saludo: {
    fontSize: 13,
    color: 'var(--text-secundario)',
    fontWeight: 500,
    marginBottom: 2,
  },
  nombreUsuario: {
    fontSize: 20,
    fontWeight: 700,
    color: 'var(--text-principal)',
    letterSpacing: '-0.02em',
  },
  headerAcciones: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
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
  btnSalir: {
    width: 42,
    height: 42,
    background: 'rgba(239, 68, 68, 0.1)',
    color: 'var(--color-error)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: 'var(--radius-full)',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifPanel: {
    background: 'var(--bg-card)',
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
  content: {
    flex: 1,
    padding: '20px 24px 100px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 16px',
    border: '1px solid var(--border-suave)',
    boxShadow: 'var(--shadow-sm)',
    gap: 10,
  },
  searchIcon: {
    fontSize: 16,
    opacity: 0.6,
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: 14,
    color: 'var(--text-principal)',
    background: 'transparent',
  },
  clearBtn: {
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
  categoriasScroll: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    paddingBottom: 4,
    scrollbarWidth: 'none',
    marginLeft: -4,
    marginRight: -4,
    paddingLeft: 4,
    paddingRight: 4,
  },
  catBtn: {
    padding: '8px 16px',
    borderRadius: 'var(--radius-full)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    border: '1px solid',
    transition: 'all 0.2s ease',
  },
  tituloRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  titulo: {
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--text-principal)',
    letterSpacing: '-0.01em',
  },
  contador: {
    fontSize: 13,
    color: 'var(--text-suave)',
    fontWeight: 500,
  },
  vacio: {
    textAlign: 'center',
    color: 'var(--text-suave)',
    marginTop: '3rem',
    fontSize: 15,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    background: 'var(--bg-card)',
    padding: '40px 24px',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-suave)',
  },
  vacioIcon: {
    fontSize: 48,
    opacity: 0.5,
  },
  vacioTexto: {
    fontSize: 14,
    color: 'var(--text-secundario)',
  },
  btnLimpiar: {
    background: 'var(--color-primario)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  card: {
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    border: '1px solid var(--border-suave)',
    boxShadow: 'var(--shadow-sm)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  imgWrap: {
    position: 'relative',
    width: '100%',
    height: 160,
    overflow: 'hidden',
  },
  img: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  categoriaBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    background: 'rgba(0, 0, 0, 0.65)',
    backdropFilter: 'blur(10px)',
    color: '#fff',
    fontSize: 11,
    fontWeight: 700,
    padding: '5px 10px',
    borderRadius: 'var(--radius-full)',
    textTransform: 'capitalize',
  },
  cardBody: {
    padding: '16px 18px',
  },
  cardTitulo: {
    fontSize: 17,
    fontWeight: 700,
    color: 'var(--text-principal)',
    marginBottom: 6,
    letterSpacing: '-0.01em',
  },
  cardDesc: {
    fontSize: 13,
    color: 'var(--text-secundario)',
    marginBottom: 10,
    lineHeight: 1.5,
  },
  cardInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  cardInfoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    color: 'var(--text-suave)',
  },
  cardInfoIcon: {
    fontSize: 12,
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
};