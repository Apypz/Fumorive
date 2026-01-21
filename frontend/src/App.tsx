// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './components/page/LandingPage'
import Session from './components/page/Session'
import Login from './components/page/Login'
import Dashboard from './components/page/Dashboard'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/session" element={<Session />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
