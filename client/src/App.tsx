import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import StudioMain from './pages/StudioMain';
import WaitingRoom from './pages/WaitingRoom';
import Game from './pages/Game';
import './App.css';

export default function App() {
  return (
    <SocketProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<StudioMain />} />
          <Route path="/waiting/:categoryId" element={<WaitingRoom />} />
          <Route path="/game/:roomId" element={<Game />} />
        </Routes>
      </BrowserRouter>
    </SocketProvider>
  );
}
