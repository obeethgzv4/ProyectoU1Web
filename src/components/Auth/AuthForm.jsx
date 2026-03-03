import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function AuthForm() {
    const [isLogin, setIsLogin] = useState(true)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(false)
    const [strength, setStrength] = useState(0)

    const { signIn, signUp } = useAuth()

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
        if (!isLogin && password !== confirmPassword) {
            setError('Las contraseñas no coinciden')
            return
        }
        setLoading(true)
        const { error } = isLogin
            ? await signIn(email, password)
            : await signUp(email, password)
        if (error) setError(error.message)
        setLoading(false)
    }

    return (
        <>
            <div className="mesh-bg"></div>
            <div className="auth-wrapper">
                <div className="glass auth-card">
                    <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }} className="text-glow">
                        {isLogin ? 'Bienvenido' : 'Explora'}
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem' }}>
                        {isLogin ? 'Ingresa a tu espacio de trabajo' : 'Comienza tu viaje hoy mismo'}
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

                        <div className="floating-input-group">
                            <input
                                className="floating-input"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Contraseña"
                                required
                            />
                            {!isLogin && password && (
                                <div style={{ marginTop: '0.75rem', padding: '0 0.5rem' }}>
                                    <div className="strength-meter">
                                        <div className="strength-bar" style={{ width: `${(strength / 5) * 100}%`, backgroundColor: getStrengthColor() }}></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {!isLogin && (
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

                        <button type="submit" className="btn-premium" disabled={loading}>
                            {loading ? 'Sincronizando...' : (isLogin ? 'Acceder' : 'Registrarme')}
                        </button>
                    </form>

                    <p style={{ marginTop: '2rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {isLogin ? '¿Nuevo aquí?' : '¿Ya eres miembro?'}
                        <span className="link" style={{ fontSize: '0.875rem' }} onClick={() => setIsLogin(!isLogin)}>
                            {isLogin ? 'Crea una cuenta' : 'Inicia sesión'}
                        </span>
                    </p>
                </div>
            </div>
        </>
    )
}
