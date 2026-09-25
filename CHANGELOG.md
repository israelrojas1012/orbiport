## [1.3.0] - 2026-09-25

### Nuevas funcionalidades
- Nuevo modulo Mi Progreso para clientes.
- Registro y consulta del progreso por ejercicio.
- Catalogo de ejercicios con nombres en ingles y espanol.
- Nueva seccion Mi Progreso integrada en la navegacion principal.

### Seguridad
- Proteccion de rutas privadas mediante autenticacion JWT.
- Validacion de identidad del usuario desde el token en reservas, inscripciones, notificaciones, perfil y progreso.
- Proteccion de rutas administrativas mediante rol de administrador.
- Validacion de propiedad de establecimientos, horarios, inscripciones, excepciones y fotografias.
- Proteccion del historial de pagos y datos de asistencias.
- Separacion entre endpoints publicos de clientes y endpoints administrativos.
- Codigos criptograficamente seguros para registro y recuperacion de contrasena.
- Limite de intentos en login, registro, verificacion y recuperacion de contrasena.

### Mejoras
- Consulta publica independiente para los horarios de establecimientos.
- Correccion de disponibilidad y actualizacion de cupos al reservar o cancelar.
- Mejoras visuales y de navegacion en Mi Progreso.
- Unificacion de la presentacion de notificaciones en las pantallas del cliente.


## [1.2.0] - 2026-09-21

### Nuevas funcionalidades
- Gestión de membresías por cliente y establecimiento.
- Fecha de vigencia opcional para membresías.
- Límite de reservas configurable por cliente.
- Visualización de membresías y reservas disponibles en el perfil del cliente.
- Historial de pagos para clientes y administradores.
- Nickname y avatar para perfiles de usuario.
- Instructor y descripción opcional en horarios y clases.

### Mejoras
- Persistencia de sesión del usuario.
- Mensajes más claros durante el inicio de sesión.
- Contador de reservas futuras en Mis Reservas.
- Mejoras en la gestión de usuarios inscritos.
- Validaciones de membresías y límites de reservas desde el backend.
- Las reservas canceladas recuperan disponibilidad dentro del límite de la membresía.