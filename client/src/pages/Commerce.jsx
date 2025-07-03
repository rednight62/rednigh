import React, { useState } from 'react';
import axios from 'axios';

export default function Commerce({ pushLog }) {
  const [provider, setProvider] = useState('ebay');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResults([]);
    pushLog && pushLog(`Searching ${provider} for "${query}"...`);
    try {
      let url = '';
      if (provider === 'ebay') {
        url = `/api/commerce/ebay/search?query=${encodeURIComponent(query)}`;
      } else if (provider === 'amazon') {
        url = `/api/commerce/amazon/search?query=${encodeURIComponent(query)}`;
      }
      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      setResults(res.data.items || res.data);
      pushLog && pushLog(`Search complete: found ${res.data.items?.length || res.data.length || 0} results on ${provider}.`);
    } catch (err) {
      setError('Search failed or API not yet integrated.');
      pushLog && pushLog(`Error: ${provider} search failed.`);
    }
    setLoading(false);
  };

  return (
    <div className="container">
      <h2>Commerce Product Search</h2>
      <form onSubmit={handleSearch} style={{marginBottom:'1rem'}}>
        <select value={provider} onChange={e=>setProvider(e.target.value)}>
          <option value="ebay">eBay</option>
          <option value="amazon">Amazon</option>
          {/* Add more as needed */}
        </select>
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search products..." style={{marginLeft:'1rem',width:'40%'}} />
        <button type="submit" style={{marginLeft:'1rem'}}>Search</button>
      </form>
      {loading && <p>Loading...</p>}
      {error && <p className="error">{error}</p>}
      {results && results.length > 0 && (
        <table style={{width:'100%',marginTop:'1rem'}}>
          <thead>
            <tr>
              <th>Title</th>
              <th>Price</th>
              <th>Link</th>
            </tr>
          </thead>
          <tbody>
            {results.map((item,i) => (
              <tr key={i}>
                <td>{item.title || item.name || item.Title}</td>
                <td>{item.price || item.sellingStatus?.currentPrice?.__value__ || '-'}</td>
                <td><a href={item.viewItemURL || item.link || '#'} target="_blank" rel="noopener noreferrer">View</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {/* Order management UI and more can be added here */}
    </div>
  );
}
