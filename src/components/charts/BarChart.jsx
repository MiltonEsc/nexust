// src/components/charts/BarChart.jsx

import React, { useEffect, useRef } from "react";
import Chart from "chart.js/auto"; // Chart.js se registra a sí mismo

function BarChart({ chartData }) {
  const chartRef = useRef(null); // Referencia al elemento <canvas>
  const chartInstance = useRef(null); // Referencia a la instancia del gráfico

  useEffect(() => {
    // Si ya existe una instancia de gráfico, la destruimos antes de crear una nueva
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Obtenemos el contexto 2D del canvas
    const myChartRef = chartRef.current.getContext("2d");

    // Creamos una nueva instancia del gráfico
    chartInstance.current = new Chart(myChartRef, {
      type: "bar",
      data: {
        labels: chartData.labels,
        datasets: [
          {
            label: "Costo Total",
            data: chartData.data,
            backgroundColor: "#4f46e5",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
      },
    });

    // Función de limpieza: se ejecuta cuando el componente se desmonta
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [chartData]); // El efecto se vuelve a ejecutar si los datos del gráfico cambian

  return <canvas ref={chartRef} />;
}

export default BarChart;
