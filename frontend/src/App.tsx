// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './components/page/LandingPage'
import Session from './components/page/Session'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/session" element={<Session />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
