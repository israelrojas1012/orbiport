import { useEffect, useState } from 'react';
import API from '../../services/api';

export default function AdminInfo({ lugar, setLugar, mostrarMensaje, styles }) {
  const [editando, setEditando] = useState(false);
  const [infoForm, setInfoForm] = useState({});
  const [fotos, setFotos] = useState([]);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [fotoIndexAdmin, setFotoIndexAdmin] = useState(0);
  const [fotoAmpliadaAdmin, setFotoAmpliadaAdmin] = useState(null);

  useEffect(() => {
    if (!lugar?.id) return;

    setInfoForm(lugar);

    API.get(`/fotos/${lugar.id}`)
      .then(res => {
        console.log('FOTOS DEL LUGAR:', res.data);
        setFotos(res.data);
      })
      .catch(err => {
        console.error('ERROR AL CARGAR FOTOS:', err);
      });
  }, [lugar?.id]);

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

      const res = await API.get(`/fotos/${lugar.id}`);
      setFotos(res.data);
      mostrarMensaje('Foto subida correctamente');
    } catch (err) {
      mostrarMensaje('Error al subir foto');
    }

    setSubiendoFoto(false);
    e.target.value = '';
  };

  const eliminarFoto = async (id) => {
    try {
      await API.delete(`/fotos/${id}`);
      setFotos(prev => prev.filter(f => f.id !== id));

      if (fotoAmpliadaAdmin !== null) {
        setFotoAmpliadaAdmin(null);
      }

      mostrarMensaje('Foto eliminada');
    } catch (err) {
      mostrarMensaje('Error al eliminar foto');
    }
  };

  const moverFoto = async (indice, direccion) => {
    const nuevoIndice = indice + direccion;

    if (nuevoIndice < 0 || nuevoIndice >= fotos.length) return;

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

  if (!lugar) return null;

  return (
    <>
      {fotos.length > 0 ? (
        <div style={styles.carruselContainer}>
          <img
            src={fotos[fotoIndexAdmin]?.url}
            alt="lugar"
            style={styles.carruselImg}
            onClick={() => setFotoAmpliadaAdmin(fotoIndexAdmin)}
          />

          {fotos.length > 1 && (
            <>
              <button
                onClick={() =>
                  setFotoIndexAdmin(
                    fotoIndexAdmin === 0
                      ? fotos.length - 1
                      : fotoIndexAdmin - 1
                  )
                }
                style={{ ...styles.carruselBtn, left: 12 }}
              >
                ‹
              </button>

              <button
                onClick={() =>
                  setFotoIndexAdmin(
                    fotoIndexAdmin === fotos.length - 1
                      ? 0
                      : fotoIndexAdmin + 1
                  )
                }
                style={{ ...styles.carruselBtn, right: 12 }}
              >
                ›
              </button>

              <div style={styles.carruselIndicadores}>
                {fotos.map((_, i) => (
                  <span
                    key={i}
                    onClick={() => setFotoIndexAdmin(i)}
                    style={{
                      ...styles.indicador,
                      background:
                        i === fotoIndexAdmin
                          ? '#fff'
                          : 'rgba(255,255,255,0.5)',
                      width: i === fotoIndexAdmin ? 24 : 8,
                    }}
                  />
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
                border:
                  i === fotoIndexAdmin
                    ? '2px solid var(--color-primario)'
                    : '2px solid transparent',
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
            <input
              style={styles.input}
              placeholder="Nombre"
              value={infoForm.nombre || ''}
              onChange={e =>
                setInfoForm({
                  ...infoForm,
                  nombre: e.target.value
                })
              }
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Descripción</label>
            <textarea
              style={styles.textarea}
              placeholder="Descripción"
              value={infoForm.descripcion || ''}
              onChange={e =>
                setInfoForm({
                  ...infoForm,
                  descripcion: e.target.value
                })
              }
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Dirección</label>
            <input
              style={styles.input}
              placeholder="Dirección"
              value={infoForm.direccion || ''}
              onChange={e =>
                setInfoForm({
                  ...infoForm,
                  direccion: e.target.value
                })
              }
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Link de Google Maps (opcional)
            </label>
            <input
              style={styles.input}
              placeholder="https://maps.google.com/..."
              value={infoForm.maps_url || ''}
              onChange={e =>
                setInfoForm({
                  ...infoForm,
                  maps_url: e.target.value
                })
              }
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Teléfono</label>
            <input
              style={styles.input}
              placeholder="0987654321"
              value={infoForm.telefono || ''}
              onChange={e =>
                setInfoForm({
                  ...infoForm,
                  telefono: e.target.value
                })
              }
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Categoría</label>
            <select
              style={styles.input}
              value={infoForm.categoria || 'general'}
              onChange={e =>
                setInfoForm({
                  ...infoForm,
                  categoria: e.target.value
                })
              }
            >
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
            <p style={styles.galeriaSubtitulo}>
              Sube las fotos que quieras mostrar en tu lugar
            </p>

            <label
              style={{
                ...styles.btnAgregar,
                textAlign: 'center',
                cursor: subiendoFoto ? 'wait' : 'pointer',
                opacity: subiendoFoto ? 0.6 : 1,
                display: 'block'
              }}
            >
              {subiendoFoto ? 'Subiendo...' : '+ Subir foto'}

              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={subirFoto}
                disabled={subiendoFoto}
              />
            </label>

            {fotos.length === 0 ? (
              <p style={styles.galeriaVacia}>
                Aún no has subido fotos
              </p>
            ) : (
              <div style={styles.galeriaGrid}>
                {fotos.map((f, indice) => (
                  <div
                    key={f.id}
                    style={styles.galeriaFotoItem}
                  >
                    <img
                      src={f.url}
                      alt={`Foto ${indice + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />

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
                      {indice === 0 ? 'PORTADA' : `#${indice + 1}`}
                    </div>

                    <div
                      style={{
                        position: 'absolute',
                        bottom: '4px',
                        left: '4px',
                        right: '4px',
                        display: 'flex',
                        gap: '4px',
                        justifyContent: 'center'
                      }}
                    >
                      <button
                        onClick={() => moverFoto(indice, -1)}
                        disabled={indice === 0}
                        style={{
                          border: 'none',
                          borderRadius: '6px',
                          padding: '7px 11px',
                          cursor:
                            indice === 0
                              ? 'default'
                              : 'pointer',
                          opacity:
                            indice === 0 ? 0.4 : 1
                        }}
                        title="Mover a la izquierda"
                      >
                        ←
                      </button>

                      <button
                        onClick={() => moverFoto(indice, 1)}
                        disabled={
                          indice === fotos.length - 1
                        }
                        style={{
                          border: 'none',
                          borderRadius: '6px',
                          padding: '7px 11px',
                          cursor:
                            indice === fotos.length - 1
                              ? 'default'
                              : 'pointer',
                          opacity:
                            indice === fotos.length - 1
                              ? 0.4
                              : 1
                        }}
                        title="Mover a la derecha"
                      >
                        →
                      </button>

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
            <button
              style={styles.btnGuardar}
              onClick={guardarInfo}
            >
              Guardar
            </button>

            <button
              style={styles.btnCancelar}
              onClick={() => {
                setEditando(false);
                setInfoForm(lugar);
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div style={styles.card}>
          <div style={styles.cardHeaderRow}>
            <div style={{ flex: 1 }}>
              <p style={styles.cardTituloGrande}>
                {lugar.nombre}
              </p>

              {lugar.categoria &&
                lugar.categoria !== 'general' && (
                  <span style={styles.categoriaBadge}>
                    {lugar.categoria}
                  </span>
                )}
            </div>

            <button
              style={styles.btnEditar}
              onClick={() => setEditando(true)}
            >
              Editar
            </button>
          </div>

          {lugar.descripcion && (
            <p style={styles.cardSub}>
              {lugar.descripcion}
            </p>
          )}

          <div style={styles.infoLista}>
            <div style={styles.infoItem}>
              <span style={styles.infoIcon}>📍</span>
              <span style={styles.infoTexto}>
                {lugar.direccion}
              </span>
            </div>

            {lugar.maps_url && (
              <div style={styles.infoItem}>
                <span style={styles.infoIcon}>🗺️</span>
                <span style={styles.infoTexto}>
                  Link de Maps configurado
                </span>
              </div>
            )}

            <div style={styles.infoItem}>
              <span style={styles.infoIcon}>📞</span>
              <span style={styles.infoTexto}>
                {lugar.telefono}
              </span>
            </div>

            <div style={styles.infoItem}>
              <span style={styles.infoIcon}>📷</span>
              <span style={styles.infoTexto}>
                {fotos.length} foto
                {fotos.length !== 1 ? 's' : ''} en galería
              </span>
            </div>
          </div>
        </div>
      )}

      {fotoAmpliadaAdmin !== null && (
        <div
          style={styles.lightboxOverlay}
          onClick={() => setFotoAmpliadaAdmin(null)}
        >
          <button
            onClick={() => setFotoAmpliadaAdmin(null)}
            style={styles.lightboxCerrar}
          >
            ✕
          </button>

          {fotoAmpliadaAdmin > 0 && (
            <button
              onClick={e => {
                e.stopPropagation();
                setFotoAmpliadaAdmin(
                  fotoAmpliadaAdmin - 1
                );
              }}
              style={{
                ...styles.lightboxNav,
                left: 12
              }}
            >
              ‹
            </button>
          )}

          {fotoAmpliadaAdmin < fotos.length - 1 && (
            <button
              onClick={e => {
                e.stopPropagation();
                setFotoAmpliadaAdmin(
                  fotoAmpliadaAdmin + 1
                );
              }}
              style={{
                ...styles.lightboxNav,
                right: 12
              }}
            >
              ›
            </button>
          )}

          <img
            src={fotos[fotoAmpliadaAdmin]?.url}
            alt=""
            style={styles.lightboxImg}
            onClick={e => e.stopPropagation()}
          />

          <p style={styles.lightboxContador}>
            {fotoAmpliadaAdmin + 1} / {fotos.length}
          </p>
        </div>
      )}
    </>
  );
}