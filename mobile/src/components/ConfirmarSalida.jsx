export default function ConfirmarSalida({ abierto, onCancelar, onConfirmar }) {
  if (!abierto) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.icono}>
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21h6" />
            <path d="M12 3v9" />
            <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
          </svg>
        </div>

        <h3 style={styles.titulo}>Cerrar sesión</h3>

        <p style={styles.texto}>
          ¿Estás seguro de que deseas cerrar sesión?
        </p>

        <div style={styles.botones}>
          <button
            type="button"
            style={styles.btnCancelar}
            onClick={onCancelar}
          >
            Cancelar
          </button>

          <button
            type="button"
            style={styles.btnConfirmar}
            onClick={onConfirmar}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 2000,
    backdropFilter: 'blur(3px)',
  },
  modal: {
    width: '100%',
    maxWidth: 360,
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px 20px 20px',
    border: '1px solid var(--border-suave)',
    boxShadow: 'var(--shadow-lg)',
    textAlign: 'center',
  },
  icono: {
    width: 48,
    height: 48,
    margin: '0 auto 12px',
    borderRadius: 'var(--radius-full)',
    background: 'rgba(239, 68, 68, 0.1)',
    color: 'var(--color-error)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: {
    fontSize: 17,
    fontWeight: 700,
    color: 'var(--text-principal)',
    marginBottom: 8,
  },
  texto: {
    fontSize: 13,
    lineHeight: 1.5,
    color: 'var(--text-secundario)',
    marginBottom: 20,
  },
  botones: {
    display: 'flex',
    gap: 8,
  },
  btnCancelar: {
    flex: 1,
    padding: '11px 10px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-suave)',
    background: 'var(--bg-hover)',
    color: 'var(--text-secundario)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnConfirmar: {
    flex: 1,
    padding: '11px 10px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    background: 'rgba(239, 68, 68, 0.1)',
    color: 'var(--color-error)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
};