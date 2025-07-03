import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Profile({ pushLog }) {
  const [profile, setProfile] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');
    axios.get('/api/profile', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        setProfile(res.data);
        setUsername(res.data.username);
      })
      .catch(() => {
        localStorage.removeItem('token');
        navigate('/login');
      });
  }, [navigate]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');
    try {
      const token = localStorage.getItem('token');
      await axios.put('/api/profile', { username, password }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMsg('Profile updated!');
      setPassword('');
      pushLog && pushLog('Profile updated successfully.');
    } catch (err) {
      setError(err.response?.data?.msg || 'Update failed');
      pushLog && pushLog('Profile update failed.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    pushLog && pushLog('User logged out.');
    navigate('/login');
  };

  if (!profile) return <div>Loading...</div>;

  return (
    <div className="container">
      <h2>Profile</h2>
      <form onSubmit={handleUpdate}>
        <input type="text" value={username} onChange={e => setUsername(e.target.value)} required />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="New password (optional)" />
        <button type="submit">Update Profile</button>
      </form>
      {msg && <p className="success">{msg}</p>}
      {error && <p className="error">{error}</p>}
      <button style={{marginTop: '2rem'}} onClick={handleLogout}>Logout</button>
    </div>
  );
}
