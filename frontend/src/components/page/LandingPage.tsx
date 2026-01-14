// src/pages/Landing.tsx
import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="landing">
      <h1>Driving & EEG Simulation</h1>
      <p>Simulasi mengemudi dengan monitoring EEG</p>

      <button onClick={() => navigate('/session')}>
        Start Simulation
      </button>
    </div>
  )
}
