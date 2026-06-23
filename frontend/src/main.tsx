import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
// Attach the persistent gamepad listeners at app startup so the wheel is caught
// the moment it sends input, regardless of which scene is mounted.
import './game/utils/gamepadRegistry'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
