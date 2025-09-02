// src/components/charts/DoughnutChart.jsx

import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

function DoughnutChart({ chartData }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    const myChartRef = chartRef.current.getContext('2d');
    
    chartInstance.current = new Chart(myChartRef, {
      type: 'doughnut', // Tipo de gráfico circular
      data: {
        labels: chartData.labels,
        datasets: [
          {
            data: chartData.data,
            backgroundColor: [ // Colores para cada sección
              '#4f46e5', // Indigo
              '#10b981', // Esmeralda
              '#f59e0b', // Ambar
            ],
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
      },
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [chartData]);

  return <canvas ref={chartRef} />;
}

export default DoughnutChart;