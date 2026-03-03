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

    // Calculate password strength
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
        if (strength <= 2) return 'var(--danger)'
        if (strength <= 3) return 'var(--warning)'
        return 'var(--success)'
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError(null)

        if (!isLogin && password !== confirmPassword) {
            setError('Las contraseñas no coinciden')
            return
        }

        if (!isLogin && strength < 3) {
            setError('La contraseña es demasiado débil')
            return
        }

        setLoading(true)

        const { error } = isLogin
            ? await signIn(email, password)
            : await signUp(email, password)

        if (error) setError(forceFriendlyError(error.message))
        setLoading(false)
    }

    const forceFriendlyError = (msg) => {
        if (msg.includes('rate limit')) return 'Demasiados intentos. Espera un minuto.'
        if (msg.includes('Invalid login')) return 'Email o contraseña incorrectos.'
        if (msg.includes('confirmed')) return 'Por favor, confirma tu correo electrónico.'
        return msg
    }

    return (
        <div className="container">
            <div className="glass-card">
                <h2>{isLogin ? 'Iniciar Sesión' : 'Nueva Cuenta'}</h2>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label>Correo Electrónico</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="ejemplo@correo.com"
                            required
                        />
                    </div>

                    <div style={{ marginBottom: isLogin ? '1.5rem' : '1.25rem' }}>
                        <label>Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                        {!isLogin && password && (
                            <div style={{ marginTop: '0.5rem' }}>
                                <div className="strength-meter">
                                    <div
                                        className="strength-bar"
                                        style={{
                                            width: `${(strength / 5) * 100}%`,
                                            backgroundColor: getStrengthColor()
                                        }}
                                    ></div>
                                </div>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                    Seguridad: {strength <= 2 ? 'Baja' : strength <= 4 ? 'Media' : 'Alta'}
                                </p>
                            </div>
                        )}
                    </div>

                    {!isLogin && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label>Confirmar Contraseña</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    )}

                    {error && <p className="error-message">{error}</p>}

                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'Procesando...' : (isLogin ? 'Entrar' : 'Crear Cuenta')}
                    </button>
                </form>

                <p className="footer-text">
                    {isLogin ? '¿Aún no tienes cuenta?' : '¿Ya tienes cuenta?'}
                    <span className="link" onClick={() => {
                        setIsLogin(!isLogin)
                        setError(null)
                    }}>
                        {isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
                    </span>
                </p>
            </div>
        </div>
    )
}
