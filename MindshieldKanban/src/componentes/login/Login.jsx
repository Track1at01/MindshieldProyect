import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from 'react'
import './login.css'

export default function Login() {
  const navigate = useNavigate()

  const cardRef = useRef(null)
  const draggingRef = useRef(false)
  const offsetRef = useRef({ x: 0, y: 0 })
  const [pos, setPos] = useState({ x: null, y: null })

  useEffect(() => {
    const setInitial = () => {
      const card = cardRef.current
      if (!card) return
      const rect = card.getBoundingClientRect()
      const x = (window.innerWidth - rect.width) / 2
      const y = (window.innerHeight - rect.height) / 3
      setPos({ x, y })
    }
    setInitial()
    window.addEventListener('resize', setInitial)
    return () => window.removeEventListener('resize', setInitial)
  }, [])

  useEffect(() => {
    const onMove = (e) => {
      if (!draggingRef.current) return
      const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX
      const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY
      setPos({ x: clientX - offsetRef.current.x, y: clientY - offsetRef.current.y })
    }
    const onUp = () => (draggingRef.current = false)

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onUp)

    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onUp)
    }
  }, [])

  const startDrag = (e) => {
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY
    const rect = cardRef.current.getBoundingClientRect()
    offsetRef.current = { x: clientX - rect.left, y: clientY - rect.top }
    draggingRef.current = true
  }

  return (



    <div
      ref={cardRef}
      className='Login'
      style={pos.x !== null && pos.y !== null ? { left: `${pos.x}px`, top: `${pos.y}px` } : {}}
    >
      <div className="drag-handle" onMouseDown={startDrag} onTouchStart={startDrag}>
        <h2>Ingresa tú código </h2>
        <p>Ingresa tu código de usuario para acceder al Dashboard</p>
      </div>
      <input type="text" name="" id="" placeholder='Codigo de usuario' />

      <button onClick={function () {
        navigate("/dashboard")
      }}>Acceder</button>

    </div>
  )
}
