import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AnalyticsCharts from '../components/AnalyticsCharts';

export default function Analytics() {
  const [userStats, setUserStats] = useState(null);
  const [commerceStats, setCommerceStats] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    axios.get('/api/analytics/users', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setUserStats(res.data));
    axios.get('/api/analytics/commerce', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setCommerceStats(res.data));
  }, [token]);

  return (
    <div className="container">
      <h2>Analytics Dashboard</h2>
      <AnalyticsCharts userStats={userStats} commerceStats={commerceStats} />
      <div style={{margin:'1rem 0'}}>
        <h3>User Stats</h3>
        {userStats ? (
          <ul>
            <li>Total Users: {userStats.totalUsers}</li>
            <li>Admin Users: {userStats.adminUsers}</li>
          </ul>
        ) : 'Loading...'}
      </div>
      <div style={{margin:'1rem 0'}}>
        <h3>Commerce Stats</h3>
        {commerceStats ? (
          <ul>
            <li>Sales: {commerceStats.sales}</li>
            <li>Revenue: {commerceStats.revenue}</li>
          </ul>
        ) : 'Loading...'}
      </div>
    </div>
  );
}
