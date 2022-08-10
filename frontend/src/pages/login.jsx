import { useAuth0 } from "@auth0/auth0-react"
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import '../styles/login.css'

export default function Login() {
    const navigate = useNavigate()

    const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0()

    useEffect(() => {
        if (!isLoading && isAuthenticated) navigate('/')
    }, [isLoading, isAuthenticated])

    if (!isLoading && !isAuthenticated) return (
        <main id="login-main">
            <h1>Chatenger</h1>
            <button onClick={() => loginWithRedirect({ prompt: 'select_account' })}>Login</button>
        </main>
    )
}