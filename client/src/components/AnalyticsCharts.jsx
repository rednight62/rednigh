import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

export default function AnalyticsCharts({ userStats, commerceStats }) {
  const userChartRef = useRef();
  const commerceChartRef = useRef();

  useEffect(() => {
    let userChart, commerceChart;
    if (userStats && userChartRef.current) {
      userChart = new Chart(userChartRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Admins', 'Users'],
          datasets: [{
            data: [userStats.adminUsers, userStats.totalUsers - userStats.adminUsers],
            backgroundColor: ['#007bff', '#aaa']
          }]
        },
        options: { plugins: { legend: { position: 'bottom' } } }
      });
    }
    if (commerceStats && commerceChartRef.current) {
      commerceChart = new Chart(commerceChartRef.current, {
        type: 'bar',
        data: {
          labels: ['Sales', 'Revenue'],
          datasets: [{
            label: 'Commerce Stats',
            data: [commerceStats.sales, commerceStats.revenue],
            backgroundColor: ['#388e3c', '#ff9800']
          }]
        },
        options: { plugins: { legend: { display: false } } }
      });
    }
    // Cleanup
    return () => {
      if (userChart) userChart.destroy();
      if (commerceChart) commerceChart.destroy();
    };
  }, [userStats, commerceStats]);

  return (
    <div style={{display:'flex',gap:'2rem',flexWrap:'wrap'}}>
      <div>
        <h4>User Breakdown</h4>
        <canvas ref={userChartRef} width={200} height={200}></canvas>
      </div>
      <div>
        <h4>Commerce Overview</h4>
        <canvas ref={commerceChartRef} width={200} height={200}></canvas>
      </div>
    </div>
  );
}
