import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/velaro_logo.png" alt="Velaro" />
        </div>

        <h1 className="auth-heading">
          Welkom <em>terug</em>
        </h1>
        <p className="auth-sub">Log in om verder te gaan</p>

        <LoginForm />

        <div className="auth-footer">
          Nog geen account?{' '}
          <a href="mailto:info@velaro.nl">Neem contact op</a>
        </div>
      </div>
    </div>
  )
}
