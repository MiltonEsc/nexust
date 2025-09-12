// Sistema de detección de anomalías con IA
export class AnomalyDetector {
  constructor() {
    this.models = new Map();
    this.thresholds = {
      maintenance_frequency: 0.7,
      cost_variance: 0.8,
      usage_patterns: 0.6,
      performance_degradation: 0.75
    };
    this.anomalyHistory = [];
  }

  // Detectar anomalías en equipos
  async detectEquipmentAnomalies(equipment, historicalData = []) {
    const anomalies = [];

    // Análisis de frecuencia de mantenimiento
    const maintenanceAnomaly = this.analyzeMaintenanceFrequency(equipment, historicalData);
    if (maintenanceAnomaly) {
      anomalies.push(maintenanceAnomaly);
    }

    // Análisis de costos
    const costAnomaly = this.analyzeCostPatterns(equipment, historicalData);
    if (costAnomaly) {
      anomalies.push(costAnomaly);
    }

    // Análisis de rendimiento
    const performanceAnomaly = this.analyzePerformance(equipment, historicalData);
    if (performanceAnomaly) {
      anomalies.push(performanceAnomaly);
    }

    // Análisis de uso
    const usageAnomaly = this.analyzeUsagePatterns(equipment, historicalData);
    if (usageAnomaly) {
      anomalies.push(usageAnomaly);
    }

    return anomalies;
  }

  // Analizar frecuencia de mantenimiento
  analyzeMaintenanceFrequency(equipment, historicalData) {
    const maintenanceLogs = equipment.trazabilidad?.filter(log => 
      log.accion === 'Mantenimiento'
    ) || [];

    if (maintenanceLogs.length < 3) return null;

    // Calcular intervalos entre mantenimientos
    const intervals = [];
    for (let i = 1; i < maintenanceLogs.length; i++) {
      const prev = new Date(maintenanceLogs[i-1].fecha);
      const curr = new Date(maintenanceLogs[i].fecha);
      const interval = (curr - prev) / (1000 * 60 * 60 * 24); // días
      intervals.push(interval);
    }

    // Calcular estadísticas
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((acc, interval) => 
      acc + Math.pow(interval - avgInterval, 2), 0
    ) / intervals.length;
    const stdDev = Math.sqrt(variance);

    // Detectar anomalía si el intervalo actual es muy diferente
    const lastInterval = intervals[intervals.length - 1];
    const zScore = Math.abs(lastInterval - avgInterval) / stdDev;

    if (zScore > this.thresholds.maintenance_frequency) {
      return {
        type: 'maintenance_frequency',
        severity: zScore > 2 ? 'high' : 'medium',
        equipment_id: equipment.id,
        message: `Frecuencia de mantenimiento anómala detectada. Intervalo actual: ${lastInterval.toFixed(1)} días vs promedio: ${avgInterval.toFixed(1)} días`,
        confidence: Math.min(zScore / 3, 1),
        recommendation: lastInterval > avgInterval 
          ? 'Considerar mantenimiento preventivo más frecuente'
          : 'El equipo puede estar siendo sobre-mantenido',
        data: {
          current_interval: lastInterval,
          average_interval: avgInterval,
          standard_deviation: stdDev,
          z_score: zScore
        }
      };
    }

    return null;
  }

  // Analizar patrones de costos
  analyzeCostPatterns(equipment, historicalData) {
    const maintenanceCosts = equipment.trazabilidad?.filter(log => 
      log.accion === 'Mantenimiento' && log.costo
    ).map(log => parseFloat(log.costo)) || [];

    if (maintenanceCosts.length < 3) return null;

    // Calcular tendencia de costos
    const avgCost = maintenanceCosts.reduce((a, b) => a + b, 0) / maintenanceCosts.length;
    const recentCosts = maintenanceCosts.slice(-3);
    const recentAvg = recentCosts.reduce((a, b) => a + b, 0) / recentCosts.length;

    const costIncrease = (recentAvg - avgCost) / avgCost;

    if (costIncrease > this.thresholds.cost_variance) {
      return {
        type: 'cost_anomaly',
        severity: costIncrease > 0.5 ? 'high' : 'medium',
        equipment_id: equipment.id,
        message: `Aumento significativo en costos de mantenimiento: ${(costIncrease * 100).toFixed(1)}%`,
        confidence: Math.min(costIncrease, 1),
        recommendation: 'Revisar si el equipo requiere reemplazo o reparación mayor',
        data: {
          average_cost: avgCost,
          recent_average: recentAvg,
          cost_increase_percentage: costIncrease * 100,
          trend: 'increasing'
        }
      };
    }

    return null;
  }

  // Analizar rendimiento del equipo
  analyzePerformance(equipment, historicalData) {
    // Simular análisis de rendimiento basado en estado y edad
    const ageInYears = equipment.fecha_compra ? 
      (new Date() - new Date(equipment.fecha_compra)) / (1000 * 60 * 60 * 24 * 365) : 0;

    const statusScore = {
      'Bueno': 1.0,
      'Regular': 0.6,
      'Malo': 0.2,
      'En reparación': 0.1
    };

    const currentScore = statusScore[equipment.estado] || 0.5;
    const expectedScore = Math.max(0.1, 1.0 - (ageInYears / 7)); // Decaimiento esperado en 7 años

    const performanceGap = expectedScore - currentScore;

    if (performanceGap > 0.3) {
      return {
        type: 'performance_degradation',
        severity: performanceGap > 0.6 ? 'high' : 'medium',
        equipment_id: equipment.id,
        message: `Degradación de rendimiento detectada. Estado actual: ${equipment.estado}`,
        confidence: Math.min(performanceGap, 1),
        recommendation: 'Considerar mantenimiento preventivo o reemplazo',
        data: {
          current_score: currentScore,
          expected_score: expectedScore,
          performance_gap: performanceGap,
          age_years: ageInYears,
          status: equipment.estado
        }
      };
    }

    return null;
  }

  // Analizar patrones de uso
  analyzeUsagePatterns(equipment, historicalData) {
    // Simular análisis de patrones de uso
    const recentActivity = equipment.trazabilidad?.slice(-10) || [];
    const activityFrequency = recentActivity.length;

    // Si hay muy poca actividad reciente, podría ser un problema
    if (activityFrequency < 2 && equipment.estado !== 'En reparación') {
      return {
        type: 'low_usage',
        severity: 'medium',
        equipment_id: equipment.id,
        message: 'Baja actividad detectada en el equipo',
        confidence: 0.7,
        recommendation: 'Verificar si el equipo está siendo utilizado correctamente',
        data: {
          recent_activity_count: activityFrequency,
          days_since_last_activity: recentActivity.length > 0 ? 
            (new Date() - new Date(recentActivity[recentActivity.length - 1].fecha)) / (1000 * 60 * 60 * 24) : 0
        }
      };
    }

    return null;
  }

  // Detectar anomalías en licencias de software
  async detectSoftwareAnomalies(software, historicalData = []) {
    const anomalies = [];

    // Análisis de uso de licencias
    const usageAnomaly = this.analyzeLicenseUsage(software, historicalData);
    if (usageAnomaly) {
      anomalies.push(usageAnomaly);
    }

    // Análisis de vencimientos
    const expiryAnomaly = this.analyzeLicenseExpiry(software);
    if (expiryAnomaly) {
      anomalies.push(expiryAnomaly);
    }

    return anomalies;
  }

  // Analizar uso de licencias
  analyzeLicenseUsage(software, historicalData) {
    const { stock, licencias_asignadas } = software;
    const usageRate = licencias_asignadas / stock;

    if (usageRate < 0.3 && stock > 5) {
      return {
        type: 'underutilized_license',
        severity: 'medium',
        software_id: software.id,
        message: `Licencia subutilizada: ${(usageRate * 100).toFixed(1)}% de uso`,
        confidence: 0.8,
        recommendation: 'Considerar reducir el stock de licencias o redistribuir',
        data: {
          total_licenses: stock,
          assigned_licenses: licencias_asignadas,
          usage_rate: usageRate
        }
      };
    }

    if (usageRate > 0.9) {
      return {
        type: 'overutilized_license',
        severity: 'high',
        software_id: software.id,
        message: `Licencia sobreutilizada: ${(usageRate * 100).toFixed(1)}% de uso`,
        confidence: 0.9,
        recommendation: 'Considerar adquirir más licencias para evitar problemas de compliance',
        data: {
          total_licenses: stock,
          assigned_licenses: licencias_asignadas,
          usage_rate: usageRate
        }
      };
    }

    return null;
  }

  // Analizar vencimiento de licencias
  analyzeLicenseExpiry(software) {
    if (!software.fecha_vencimiento) return null;

    const expiryDate = new Date(software.fecha_vencimiento);
    const today = new Date();
    const daysToExpiry = (expiryDate - today) / (1000 * 60 * 60 * 24);

    if (daysToExpiry < 30) {
      return {
        type: 'license_expiring',
        severity: daysToExpiry < 7 ? 'high' : 'medium',
        software_id: software.id,
        message: `Licencia vence en ${Math.ceil(daysToExpiry)} días`,
        confidence: 1.0,
        recommendation: 'Renovar licencia inmediatamente para evitar interrupciones',
        data: {
          expiry_date: software.fecha_vencimiento,
          days_to_expiry: Math.ceil(daysToExpiry),
          software_name: software.nombre
        }
      };
    }

    return null;
  }

  // Detectar anomalías en costos generales
  async detectCostAnomalies(companyData) {
    const anomalies = [];

    // Análisis de tendencias de costos
    const costTrend = this.analyzeCostTrends(companyData);
    if (costTrend) {
      anomalies.push(costTrend);
    }

    // Análisis de presupuesto vs gastos
    const budgetAnomaly = this.analyzeBudgetVariance(companyData);
    if (budgetAnomaly) {
      anomalies.push(budgetAnomaly);
    }

    return anomalies;
  }

  // Analizar tendencias de costos
  analyzeCostTrends(companyData) {
    const { monthlyCosts, budget } = companyData;
    
    if (!monthlyCosts || monthlyCosts.length < 3) return null;

    // Calcular tendencia
    const recentMonths = monthlyCosts.slice(-3);
    const earlierMonths = monthlyCosts.slice(-6, -3);
    
    const recentAvg = recentMonths.reduce((a, b) => a + b, 0) / recentMonths.length;
    const earlierAvg = earlierMonths.reduce((a, b) => a + b, 0) / earlierMonths.length;
    
    const trend = (recentAvg - earlierAvg) / earlierAvg;

    if (Math.abs(trend) > 0.2) {
      return {
        type: 'cost_trend',
        severity: Math.abs(trend) > 0.5 ? 'high' : 'medium',
        message: `Tendencia de costos ${trend > 0 ? 'creciente' : 'decreciente'}: ${(Math.abs(trend) * 100).toFixed(1)}%`,
        confidence: Math.min(Math.abs(trend), 1),
        recommendation: trend > 0 
          ? 'Revisar gastos y considerar optimizaciones'
          : 'Excelente control de costos, mantener la tendencia',
        data: {
          recent_average: recentAvg,
          earlier_average: earlierAvg,
          trend_percentage: trend * 100,
          direction: trend > 0 ? 'increasing' : 'decreasing'
        }
      };
    }

    return null;
  }

  // Analizar variación de presupuesto
  analyzeBudgetVariance(companyData) {
    const { monthlyCosts, budget } = companyData;
    
    if (!monthlyCosts || !budget) return null;

    const currentMonthCost = monthlyCosts[monthlyCosts.length - 1];
    const budgetVariance = (currentMonthCost - budget) / budget;

    if (Math.abs(budgetVariance) > 0.1) {
      return {
        type: 'budget_variance',
        severity: Math.abs(budgetVariance) > 0.2 ? 'high' : 'medium',
        message: `Variación de presupuesto: ${(budgetVariance * 100).toFixed(1)}%`,
        confidence: Math.min(Math.abs(budgetVariance), 1),
        recommendation: budgetVariance > 0 
          ? 'Gastos exceden el presupuesto, revisar y ajustar'
          : 'Gastos por debajo del presupuesto, considerar inversiones adicionales',
        data: {
          current_cost: currentMonthCost,
          budget: budget,
          variance_percentage: budgetVariance * 100,
          over_budget: budgetVariance > 0
        }
      };
    }

    return null;
  }

  // Obtener resumen de anomalías
  getAnomalySummary(anomalies) {
    const summary = {
      total: anomalies.length,
      by_severity: {
        high: anomalies.filter(a => a.severity === 'high').length,
        medium: anomalies.filter(a => a.severity === 'medium').length,
        low: anomalies.filter(a => a.severity === 'low').length
      },
      by_type: {}
    };

    anomalies.forEach(anomaly => {
      summary.by_type[anomaly.type] = (summary.by_type[anomaly.type] || 0) + 1;
    });

    return summary;
  }

  // Guardar anomalía en historial
  saveAnomaly(anomaly) {
    this.anomalyHistory.push({
      ...anomaly,
      detected_at: new Date(),
      id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
  }

  // Obtener historial de anomalías
  getAnomalyHistory(limit = 100) {
    return this.anomalyHistory
      .sort((a, b) => new Date(b.detected_at) - new Date(a.detected_at))
      .slice(0, limit);
  }
}

// Instancia global del detector de anomalías
export const anomalyDetector = new AnomalyDetector();
