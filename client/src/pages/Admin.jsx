import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Admin({ pushLog }) {
  const [users, setUsers] = useState([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiProvider, setAiProvider] = useState('openai');
  const [aiModel, setAiModel] = useState('gpt-4o');
  const [googleQuery, setGoogleQuery] = useState('');
  const [googleCx, setGoogleCx] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [tab, setTab] = useState('manual');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem('token');
  useEffect(() => {
    if (tab === 'manual') fetchUsers();
    // eslint-disable-next-line
  }, [tab]);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    pushLog && pushLog('Fetching user list...');
    try {
      const res = await axios.get('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } });
      setUsers(res.data);
      pushLog && pushLog('User list loaded.');
    } catch (err) {
      setError('Failed to fetch users');
      pushLog && pushLog('Failed to fetch user list.');
    }
    setLoading(false);
  };

  const changeRole = async (id, role) => {
    try {
      setLoading(true);
      await axios.put(`/api/admin/users/${id}/role`, { role }, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      pushLog && pushLog(`User role changed to ${role}.`);
      await fetchUsers();
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to update user role';
      setError(errorMsg);
      pushLog && pushLog(`Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      setLoading(true);
      await axios.delete(`/api/admin/users/${id}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      pushLog && pushLog('User deleted successfully.');
      await fetchUsers();
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to delete user';
      setError(errorMsg);
      pushLog && pushLog(`Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    };
      pushLog && pushLog('Failed to delete user.');
    }
  };

  const sendAiPrompt = async (e) => {
    e.preventDefault();
    setAiResponse('');
    try {
      let body = { prompt: aiPrompt, provider: aiProvider, model: aiModel };
      if (aiProvider === 'google') {
        body.googleParams = { query: googleQuery, cx: googleCx };
      }
      pushLog && pushLog('AI agent request sent.');
      const res = await axios.post('/api/admin/ai-agent', body, { headers: { Authorization: `Bearer ${token}` } });
      setAiResponse(res.data.response);
      pushLog && pushLog('AI agent response received.');
    } catch {
      setAiResponse('AI agent unavailable.');
      pushLog && pushLog('AI agent request failed.');
    }
  };

  return (
    <div className="container">
      <h2>Admin Control Panel</h2>
      <div style={{marginBottom:'1rem'}}>
        <button onClick={() => setTab('manual')} disabled={tab==='manual'}>Manual Controls</button>
        <button onClick={() => setTab('ai')} disabled={tab==='ai'} style={{marginLeft:'1rem'}}>AI Agent</button>
      </div>
      {tab === 'manual' && (
        <div>
          <h3>User Management</h3>
          {error && <p className="error">{error}</p>}
          <table style={{width:'100%',margin:'1rem 0'}}>
            <thead><tr><th>Username</th><th>Role</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id}>
                  <td>{u.username}</td>
                  <td>{u.role}</td>
                  <td>
                    <button onClick={() => changeRole(u._id, u.role==='admin'?'user':'admin')}>
                      {u.role==='admin'?'Demote':'Promote'}
                    </button>
                    <button onClick={() => deleteUser(u._id)} style={{marginLeft:'1rem',color:'#d32f2f'}}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab === 'ai' && (
        <div>
          <h3>AI Agent</h3>
          <form onSubmit={sendAiPrompt} style={{marginBottom:'1rem'}}>
            <div style={{marginBottom:'0.5rem'}}>
              <label>Provider:&nbsp;
                <select value={aiProvider} onChange={e=>setAiProvider(e.target.value)}>
                  <option value="openai">OpenAI (GPT-4.0/4.1)</option>
                  <option value="claude">Claude (3.5/3.7/4)</option>
                  <option value="deepseek">DeepSeek (R1/V3)</option>
                  <option value="google">Google (Search/Shop)</option>
                </select>
              </label>
              &nbsp;|
              <label style={{marginLeft:'1rem'}}>Model:&nbsp;
                <input value={aiModel} onChange={e=>setAiModel(e.target.value)} style={{width:'120px'}} placeholder="e.g. gpt-4.0" />
              </label>
            </div>
            {aiProvider === 'google' && (
              <div style={{marginBottom:'0.5rem'}}>
                <input value={googleQuery} onChange={e=>setGoogleQuery(e.target.value)} placeholder="Google Query" style={{width:'40%'}} />
                <input value={googleCx} onChange={e=>setGoogleCx(e.target.value)} placeholder="Custom Search CX" style={{width:'35%',marginLeft:'1rem'}} />
              </div>
            )}
            <input value={aiPrompt} onChange={e=>setAiPrompt(e.target.value)} placeholder="Ask the AI agent..." style={{width:'80%'}} />
            <button type="submit" style={{marginLeft:'1rem'}}>Send</button>
          </form>
          {aiResponse && <div style={{background:'#f4f6f8',padding:'1rem',borderRadius:'6px'}}><b>AI:</b> {aiResponse}</div>}
        </div>
      )}
    </div>
  );
}
