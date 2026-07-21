import './App.css'
import Dashboard from './componentes/dashboard/dashboard.jsx'
import Login from './componentes/login/Login.jsx'
import {BrowserRouter} from "react-router"
import Rutas from "./componentes/Rutas.jsx"

function App() {
  return (
   <BrowserRouter>
      <Rutas />
    </BrowserRouter>
  )
}

export default App
