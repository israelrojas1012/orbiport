import { useState } from 'react';
import API from '../../services/api';

export default function AdminPerfil({ usuario, lugar, mostrarMensaje, styles }) {
  const [perfilForm, setPerfilForm] = useState({
    nombre: usuario.nombre || '',
    apellido: usuario.apellido || ''
  });

  const [editandoPerfil, setEditandoPerfil] = useState(false);

  const [passFormAdmin, setPassFormAdmin] = useState({
    actual: '',
    nueva: '',
    confirmar: ''
  });

  const [editandoPassAdmin, setEditandoPassAdmin] = useState(false);
  const [mostrarActualAdmin, setMostrarActualAdmin] = useState(false);
  const [mostrarNuevaAdmin, setMostrarNuevaAdmin] = useState(false);
  const [mostrarConfirmarAdmin, setMostrarConfirmarAdmin] = useState(false);

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

  return (
    <div style={styles.perfilContainer}>
      <div style={styles.avatarSeccion}>
        <div style={styles.avatar}>
          <span style={styles.avatarLetra}>
            {usuario.nombre?.charAt(0).toUpperCase()}
          </span>
        </div>

        <h3 style={styles.nombre}>
          {usuario.nombre} {usuario.apellido}
        </h3>

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

          {!editandoPerfil && (
            <button
              style={styles.btnEditar}
              onClick={() => setEditandoPerfil(true)}
            >
              Editar
            </button>
          )}
        </div>

        {editandoPerfil ? (
          <div style={styles.formGroup}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Nombre</label>
              <input
                style={styles.input}
                placeholder="Nombre"
                value={perfilForm.nombre}
                onChange={e =>
                  setPerfilForm({
                    ...perfilForm,
                    nombre: e.target.value
                  })
                }
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Apellido</label>
              <input
                style={styles.input}
                placeholder="Apellido"
                value={perfilForm.apellido}
                onChange={e =>
                  setPerfilForm({
                    ...perfilForm,
                    apellido: e.target.value
                  })
                }
              />
            </div>

            <div style={styles.infoBoxNoEditable}>
              <p style={styles.infoBoxLabel}>Correo (no editable)</p>
              <p style={styles.infoBoxValor}>{usuario.correo}</p>
            </div>

            <div style={styles.botonesRow}>
              <button
                style={styles.btnGuardar}
                onClick={guardarPerfilAdmin}
              >
                Guardar
              </button>

              <button
                style={styles.btnCancelar}
                onClick={() => {
                  setEditandoPerfil(false);
                  setPerfilForm({
                    nombre: usuario.nombre,
                    apellido: usuario.apellido
                  });
                }}
              >
                Cancelar
              </button>
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
              <span style={styles.infoValor2Pequeno}>
                {usuario.correo}
              </span>
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

          {!editandoPassAdmin && (
            <button
              style={styles.btnEditar}
              onClick={() => setEditandoPassAdmin(true)}
            >
              Cambiar
            </button>
          )}
        </div>

        {editandoPassAdmin ? (
          <div style={styles.formGroup}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Contraseña actual</label>

              <div style={styles.passwordWrap}>
                <input
                  style={styles.passwordInput}
                  type={mostrarActualAdmin ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={passFormAdmin.actual}
                  onChange={e =>
                    setPassFormAdmin({
                      ...passFormAdmin,
                      actual: e.target.value
                    })
                  }
                />

                <button
                  type="button"
                  style={styles.togglePassword}
                  onClick={() => setMostrarActualAdmin(!mostrarActualAdmin)}
                  aria-label={
                    mostrarActualAdmin ? 'Ocultar contraseña' : 'Mostrar contraseña'
                  }
                >
                  {mostrarActualAdmin ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Nueva contraseña</label>

              <div style={styles.passwordWrap}>
                <input
                  style={styles.passwordInput}
                  type={mostrarNuevaAdmin ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={passFormAdmin.nueva}
                  onChange={e =>
                    setPassFormAdmin({
                      ...passFormAdmin,
                      nueva: e.target.value
                    })
                  }
                />

                <button
                  type="button"
                  style={styles.togglePassword}
                  onClick={() => setMostrarNuevaAdmin(!mostrarNuevaAdmin)}
                  aria-label={
                    mostrarNuevaAdmin ? 'Ocultar contraseña' : 'Mostrar contraseña'
                  }
                >
                  {mostrarNuevaAdmin ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>
                Confirmar nueva contraseña
              </label>

              <div style={styles.passwordWrap}>
                <input
                  style={styles.passwordInput}
                  type={mostrarConfirmarAdmin ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={passFormAdmin.confirmar}
                  onChange={e =>
                    setPassFormAdmin({
                      ...passFormAdmin,
                      confirmar: e.target.value
                    })
                  }
                />

                <button
                  type="button"
                  style={styles.togglePassword}
                  onClick={() => setMostrarConfirmarAdmin(!mostrarConfirmarAdmin)}
                  aria-label={
                    mostrarConfirmarAdmin
                      ? 'Ocultar contraseña'
                      : 'Mostrar contraseña'
                  }
                >
                  {mostrarConfirmarAdmin ? '🙈' : '👁️'}
                </button>
              </div>

              <p style={styles.hint}>
                Letras y números, mínimo 6 caracteres
              </p>
            </div>

            <div style={styles.botonesRow}>
              <button
                style={styles.btnGuardar}
                onClick={cambiarPasswordAdmin}
              >
                Guardar
              </button>

              <button
                style={styles.btnCancelar}
                onClick={() => {
                  setEditandoPassAdmin(false);
                  setPassFormAdmin({
                    actual: '',
                    nueva: '',
                    confirmar: ''
                  });
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div style={styles.passDisplay}>
            <span style={styles.passDots}>••••••••</span>
          </div>
        )}
      </div>
    </div>
  );
}