import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Registro from './pages/Registro';
import Home from './pages/Home';
import Perfil from './pages/Perfil';
import MisReservas from './pages/MisReservas';
import DetalleLugar from './pages/DetalleLugar';
import RecuperarPassword from './pages/RecuperarPassword';
import AdminPanel from './pages/AdminPanel';

export default function App() {
  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
  const token = localStorage.getItem('token');

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            token && usuario
              ? <Navigate to={usuario.rol === 'admin' ? '/admin' : '/home'} replace />
              : <Login />
          }
        />

        <Route path="/registro" element={<Registro />} />
        <Route path="/home" element={<Home />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/mis-reservas" element={<MisReservas />} />
        <Route path="/lugar/:id" element={<DetalleLugar />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/recuperar" element={<RecuperarPassword />} />
      </Routes>
    </BrowserRouter>
  );
}