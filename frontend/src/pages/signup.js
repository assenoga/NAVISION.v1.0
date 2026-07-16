import { useState } from 'react'
import { useSignup } from '../hooks/useSignup'

const Signup = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('Procurement Officer')
  const [department, setDepartment] = useState('Operations')
  const { signup, error, isLoading } = useSignup()

  const handleSubmit = async (e) => {
    e.preventDefault()
    await signup(email, password, fullName, role, department)
  }

  return (
    <form className="signup" onSubmit={handleSubmit}>
      <h3>Create NAVISION Account</h3>
      <label>Full Name</label>
      <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      <label>Email</label>
      <input type="email" onChange={(e) => setEmail(e.target.value)} value={email} required />
      <label>Password</label>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <label>Role</label>
      <select value={role} onChange={(e) => setRole(e.target.value)}>
        <option>Procurement Officer</option>
        <option>Executive Director</option>
        <option>Chief Finance Officer</option>
        <option>Managing Director</option>
        <option>System Administrator</option>
      </select>
      <label>Department</label>
      <input value={department} onChange={(e) => setDepartment(e.target.value)} />
      <button disabled={isLoading}>Sign Up</button>
      {error && <div className="error">{error}</div>}
    </form>
  )
}

export default Signup