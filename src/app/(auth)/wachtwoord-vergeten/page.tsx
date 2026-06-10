import WachtwoordVergetenForm from './WachtwoordVergetenForm'

export default function WachtwoordVergetenPage() {
  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/velaro_logo.png" alt="Velaro" />
        </div>

        <h1 className="auth-heading">
          Wachtwoord <em>vergeten</em>
        </h1>
        <p className="auth-sub">
          Vul je e-mailadres in en we sturen je een herstelmail.
        </p>

        <WachtwoordVergetenForm />
      </div>
    </div>
  )
}
