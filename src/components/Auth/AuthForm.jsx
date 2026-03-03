import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function AuthForm() {
    const [mode, setMode] = useState('login') // 'login', 'signup', 'reset'
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(null)
    const [loading, setLoading] = useState(false)
    const [strength, setStrength] = useState(0)

    const { signIn, signUp, resetPassword } = useAuth()

    useEffect(() => {
        let score = 0
        if (password.length > 6) score++
        if (password.length > 10) score++
        if (/[A-Z]/.test(password)) score++
        if (/[0-9]/.test(password)) score++
        if (/[^A-Za-z0-9]/.test(password)) score++
        setStrength(score)
    }, [password])

    const getStrengthColor = () => {
        if (strength <= 2) return '#ef4444'
        if (strength <= 3) return '#f59e0b'
        return '#10b981'
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError(null)
        setSuccess(null)

        if (mode === 'reset') {
            setLoading(true)
            const { error } = await resetPassword(email)
            if (error) setError(error.message)
            else setSuccess('Se ha enviado un enlace de recuperación a tu correo.')
            setLoading(false)
            return
        }

        if (mode === 'signup' && password !== confirmPassword) {
            setError('Las contraseñas no coinciden')
            return
        }

        setLoading(true)
        const { error } = mode === 'login'
            ? await signIn(email, password)
            : await signUp(email, password)

        if (error) {
            if (error.message.includes('Invalid login credentials')) {
                setError('Credenciales incorrectas. ¿Olvidaste tu contraseña?')
            } else {
                setError(error.message)
            }
        }
        setLoading(false)
    }

    return (
        <>
            <div className="mesh-bg"></div>
            <div className="auth-wrapper">
                <div className="glass auth-card">
                    <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }} className="text-glow">
                        {mode === 'login' ? 'Bienvenido' : mode === 'signup' ? 'Explora' : 'Recuperar'}
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem' }}>
                        {mode === 'login'
                            ? 'Ingresa a tu espacio de trabajo'
                            : mode === 'signup'
                                ? 'Comienza tu viaje hoy mismo'
                                : 'Ingresa tu correo para restablecer tu cuenta'}
                    </p>

                    <form onSubmit={handleSubmit}>
                        <div className="floating-input-group">
                            <input
                                className="floating-input"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Correo Electrónico"
                                required
                            />
                        </div>

                        {mode !== 'reset' && (
                            <div className="floating-input-group" style={{ marginBottom: mode === 'login' ? '0.5rem' : '1.5rem' }}>
                                <input
                                    className="floating-input"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Contraseña"
                                    required
                                />
                                {mode === 'signup' && password && (
                                    <div style={{ marginTop: '0.75rem', padding: '0 0.5rem' }}>
                                        <div className="strength-meter">
                                            <div className="strength-bar" style={{ width: `${(strength / 5) * 100}%`, backgroundColor: getStrengthColor() }}></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {mode === 'login' && (
                            <p style={{ textAlign: 'right', marginBottom: '1.5rem' }}>
                                <span className="link" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }} onClick={() => setMode('reset')}>
                                    ¿Olvidaste tu contraseña?
                                </span>
                            </p>
                        )}

                        {mode === 'signup' && (
                            <div className="floating-input-group">
                                <input
                                    className="floating-input"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirmar Contraseña"
                                    required
                                />
                            </div>
                        )}

                        {error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>{error}</p>}
                        {success && <p style={{ color: 'var(--success)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>{success}</p>}

                        <button type="submit" className="btn-premium" disabled={loading}>
                            {loading ? 'Sincronizando...' : (mode === 'login' ? 'Acceder' : mode === 'signup' ? 'Registrarme' : 'Enviar Enlace')}
                        </button>
                    </form>

                    <p style={{ marginTop: '2rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {mode === 'login' ? '¿Nuevo aquí?' : '¿Recordaste tu contraseña?'}
                        <span className="link" style={{ fontSize: '0.875rem' }} onClick={() => {
                            setMode(mode === 'login' ? 'signup' : 'login')
                            setError(null)
                            setSuccess(null)
                        }}>
                            {mode === 'login' ? 'Crea una cuenta' : 'Inicia sesión'}
                        </span>
                    </p>
                </div>
            </div>
        </>
    )
}
