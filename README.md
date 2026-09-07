\# 🏟️ Orbiport



> Prototipo de plataforma digital para el control de asistencia y reservas en centros de actividad física



Aplicación web progresiva (PWA) desarrollada como proyecto de titulación de la Pontificia Universidad Católica del Ecuador (PUCE), Facultad de Ingeniería en Sistemas. Orbiport permite a los estudiantes reservar horarios en espacios deportivos universitarios y a los administradores gestionar la asistencia, los cupos y los pagos por incumplimiento.



\---



\## ✨ Características



\### 👤 Módulo Cliente



\- Registro e inicio de sesión con validación de correo institucional PUCE

\- Recuperación de contraseña vía correo electrónico

\- Visualización de espacios deportivos disponibles con galería de fotos

\- Solicitud de inscripción a centros de actividad física

\- Reserva, edición y cancelación de horarios (mínimo 2 horas de anticipación)

\- Visualización de personas inscritas por horario

\- Historial de reservas personales

\- Edición de perfil y cambio de contraseña

\- Aceptación obligatoria de términos y condiciones



\### ⚙️ Módulo Administrador



\- Gestión completa de información del centro deportivo

\- Configuración de horarios semanales por día

\- Copiado masivo de horarios entre días

\- Gestión de días especiales (cerrados o con horarios diferentes)

\- Aprobación y rechazo de solicitudes de inscripción

\- Control de asistencia con marcado individual o masivo

\- Gestión de saldos pendientes y registro de pagos

\- Visualización de inscritos por horario con selector de fecha

\- Penalización automática por inasistencia ($0.25 por falta)

\- Aceptación obligatoria de términos y condiciones en el primer ingreso



\### 🌐 Funcionalidades generales



\- Aplicación Web Progresiva (PWA) instalable en dispositivos móviles

\- Modo claro y oscuro con persistencia de preferencia

\- Diseño responsivo orientado a dispositivos móviles

\- Notificaciones automáticas por correo electrónico

\- Almacenamiento optimizado de imágenes en la nube



\---



\## 🛠️ Tecnologías



\### Frontend

\- \*\*React 18\*\* – Biblioteca para construir la interfaz de usuario

\- \*\*Vite\*\* – Empaquetador y servidor de desarrollo

\- \*\*React Router\*\* – Enrutamiento del lado del cliente

\- \*\*Axios\*\* – Cliente HTTP para consumir la API

\- \*\*vite-plugin-pwa\*\* – Configuración de la aplicación web progresiva



\### Backend

\- \*\*Node.js\*\* – Entorno de ejecución de JavaScript

\- \*\*Express\*\* – Framework para construir la API REST

\- \*\*JSON Web Token (JWT)\*\* – Autenticación y autorización

\- \*\*bcrypt\*\* – Hash seguro de contraseñas

\- \*\*Nodemailer\*\* – Envío de correos electrónicos

\- \*\*Cloudinary\*\* – Almacenamiento de imágenes en la nube

\- \*\*Multer\*\* – Manejo de archivos subidos



\### Base de datos

\- \*\*PostgreSQL\*\* – Sistema de gestión de bases de datos relacional



\---



\## 🏗️ Arquitectura



Orbiport está construido bajo una arquitectura cliente-servidor de tres capas:



\- \*\*Cliente (PWA)\*\* → React + Vite (puerto 5173)

\- \*\*API REST\*\* → Node.js + Express (puerto 4000)

\- \*\*Base de datos\*\* → PostgreSQL (puerto 5432)



\---



\## 🚀 Instalación



\### Requisitos previos

\- Node.js v18 o superior

\- PostgreSQL v14 o superior

\- Cuenta de Cloudinary (para almacenamiento de imágenes)

\- Cuenta de Gmail con contraseña de aplicación (para envío de correos)



\### Pasos



1\. Clonar el repositorio:



&#x20;      git clone https://github.com/israelrojas1012/Orbiport.git

&#x20;      cd Orbiport



2\. Configurar el backend:



&#x20;      cd backend

&#x20;      npm install



Crear un archivo `.env` en la carpeta `backend` con las variables de entorno necesarias (base de datos, JWT, Gmail, Cloudinary).



3\. Configurar el frontend:



&#x20;      cd ../mobile

&#x20;      npm install



4\. Configurar la base de datos:

&#x20;  - Crear una base de datos llamada `Orbiport` en PostgreSQL

&#x20;  - Ejecutar los scripts SQL de creación de tablas



\---



\## ▶️ Uso



\### Iniciar el backend



&#x20;   cd backend

&#x20;   node src/index.js



El servidor se ejecutará en `http://localhost:4000`.



\### Iniciar el frontend



&#x20;   cd mobile

&#x20;   npm run dev



La aplicación estará disponible en `http://localhost:5173`.



\### Instalación como PWA

Desde un dispositivo móvil o navegador compatible, acceda a la aplicación y seleccione la opción "Agregar a pantalla de inicio" para instalarla como aplicación nativa.



\---



\## 📁 Estructura del proyecto



&#x20;   Orbiport/

&#x20;   ├── backend/

&#x20;   │   ├── src/

&#x20;   │   │   ├── routes/         (Rutas de la API REST)

&#x20;   │   │   ├── cloudinary.js   (Configuración de Cloudinary)

&#x20;   │   │   ├── email.js        (Configuración de Nodemailer)

&#x20;   │   │   └── index.js        (Punto de entrada del servidor)

&#x20;   │   ├── package.json

&#x20;   │   └── .env                (Variables de entorno, no incluido)

&#x20;   │

&#x20;   ├── mobile/

&#x20;   │   ├── public/             (Iconos PWA)

&#x20;   │   ├── src/

&#x20;   │   │   ├── components/     (Componentes reutilizables)

&#x20;   │   │   ├── context/        (Contextos de React)

&#x20;   │   │   ├── pages/          (Páginas de la aplicación)

&#x20;   │   │   ├── services/       (Servicios para consumir la API)

&#x20;   │   │   └── index.css       (Estilos globales y temas)

&#x20;   │   ├── index.html

&#x20;   │   ├── package.json

&#x20;   │   └── vite.config.js

&#x20;   │

&#x20;   ├── .gitignore

&#x20;   └── README.md



\---



\## 👨‍🎓 Autor



\*\*Bryan Israel Rojas Ortiz\*\*



Estudiante de Ingeniería en Sistemas  

Pontificia Universidad Católica del Ecuador (PUCE)



\*\*Tutor:\*\* Mtr. Rafael Melgarejo Heredia



\---



\## 📄 Licencia



Este proyecto fue desarrollado con fines académicos como requisito de titulación de la Pontificia Universidad Católica del Ecuador.



\---



Desarrollado con ❤️ para PUCE · 2026

