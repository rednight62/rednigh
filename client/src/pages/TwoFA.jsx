import React, { useState } from 'react';
import axios from 'axios';

export default function TwoFA({ pushLog }) {
  const [qr, setQr] = useState('');
  const [secret, setSecret] = useState('');
  const [token, setToken] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [msg, setMsg] = useState('');
  const tokenHeader = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };

  const enable2FA = async () => {
    setMsg('');
    const res = await axios.post('/api/2fa/enable', {}, tokenHeader);
    setQr(res.data.qr); setSecret(res.data.secret);
    setEnabled(true);
    pushLog && pushLog('2FA enabled: scan QR with Authenticator app.');
  };
  const verify2FA = async () => {
    setMsg('');
    try {
      await axios.post('/api/2fa/verify', { token }, tokenHeader);
      setMsg('2FA verified!');
      pushLog && pushLog('2FA verified successfully.');
    } catch {
      setMsg('Invalid 2FA code.');
      pushLog && pushLog('2FA verification failed.');
    }
  };
  const disable2FA = async () => {
    await axios.post('/api/2fa/disable', {}, tokenHeader);
    setEnabled(false); setQr(''); setSecret(''); setToken('');
    setMsg('2FA disabled.');
    pushLog && pushLog('2FA disabled.');
  };

  return (
    <div className="container">
      <h2>Two-Factor Authentication (2FA)</h2>
      {!enabled && (
        <button onClick={enable2FA}>Enable 2FA</button>
      )}
      {qr && (
        <div>
          <p>Scan this QR code with your Authenticator app:</p>
          <img src={qr} alt="2FA QR" style={{width:180}} />
          <p>Or enter secret manually: <b>{secret}</b></p>
        </div>
      )}
      {enabled && (
        <div style={{marginTop:'1em'}}>
          <input value={token} onChange={e=>setToken(e.target.value)} placeholder="Enter 2FA code" />
          <button onClick={verify2FA}>Verify</button>
          <button onClick={disable2FA} style={{marginLeft:10}}>Disable 2FA</button>
        </div>
      )}
      {msg && <div style={{marginTop:'1em',color:msg.includes('Invalid')?'#f44':'#0f0'}}>{msg}</div>}
    </div>
  );
}
