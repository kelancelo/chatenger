import Login from "./pages/login"
import Index from './pages/index'
import { Routes, Route } from 'react-router-dom'

function App() {
  return (
    <Routes>
      <Route path='/' element={<Index />} />
      <Route path='/login' element={<Login />} />
    </Routes>

  )
}

export default App
