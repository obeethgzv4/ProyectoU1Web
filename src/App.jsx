import { AuthProvider, useAuth } from './context/AuthContext'
import AuthForm from './components/Auth/AuthForm'
import TaskManager from './components/Tasks/TaskManager'

function AppContent() {
  const { user } = useAuth()

  return (
    <main>
      {user ? <TaskManager /> : <AuthForm />}
    </main>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
