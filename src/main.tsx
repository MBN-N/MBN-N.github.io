import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

history.scrollRestoration = 'manual'
window.addEventListener('hashchange', () => location.reload())

createRoot(document.getElementById('root')!).render(<App />)
