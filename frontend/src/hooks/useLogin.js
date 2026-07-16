import {useState} from 'react'
import { useAuthContext } from './useAuthContext'


export const useLogin = () => {
    const [error, setError] = useState(null)
    const [isLoading, setIsLoading] = useState(null)
    const { dispatch } = useAuthContext()

    const login = async (identifier, password) => {
        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/user/login', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({identifier, password})
            })
            const json = await response.json()

            if (!response.ok) {
                setIsLoading(false)
                const errorMessage = json.error || 'Unable to sign in. Check your credentials.'
                setError(errorMessage)
                return { user: null, error: errorMessage }
            }

            localStorage.setItem('user', JSON.stringify(json))
            dispatch({type: 'LOGIN', payload: json})
            setIsLoading(false)
            return { user: json, error: null }
        } catch (err) {
            setIsLoading(false)
            const errorMessage = 'The server is unavailable right now. Please try again in a moment.'
            setError(errorMessage)
            return { user: null, error: errorMessage }
        }
    }

    return { login, isLoading, error }
}
