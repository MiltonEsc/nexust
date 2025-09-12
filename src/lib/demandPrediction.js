// Sistema de predicción de demanda y análisis de necesidades futuras
export class DemandPredictionEngine {
  constructor() {
    this.models = new Map();
    this.predictionHistory = new Map();
    this.seasonalPatterns = new Map();
    this.initializeModels();
  }

  // Inicializar modelos de predicción
  initializeModels() {
    // Modelo para equipos
    this.models.set('equipment_demand', {
      type: 'time_series',
      factors: ['historical_purchases', 'maintenance_frequency', 'age_distribution', 'growth_rate'],
      weights: {
        historical_purchases: 0.4,
        maintenance_frequency: 0.3,
        age_distribution: 0.2,
        growth_rate: 0.1
      }
    });

    // Modelo para software
    this.models.set('software_demand', {
      type: 'license_usage',
      factors: ['current_usage', 'growth_trend', 'expiry_schedule', 'business_expansion'],
      weights: {
        current_usage: 0.5,
        growth_trend: 0.2,
        expiry_schedule: 0.2,
        business_expansion: 0.1
      }
    });

    // Modelo para mantenimiento
    this.models.set('maintenance_demand', {
      type: 'failure_prediction',
      factors: ['equipment_age', 'usage_intensity', 'maintenance_history', 'environmental_factors'],
      weights: {
        equipment_age: 0.3,
        usage_intensity: 0.25,
        maintenance_history: 0.25,
        environmental_factors: 0.2
      }
    });
  }

  // Predecir demanda de equipos
  async predictEquipmentDemand(companyData, timeHorizon = 12) {
    const { equipos, historicalPurchases, growthRate, budget } = companyData;
    
    // Analizar distribución de edad de equipos
    const ageDistribution = this.analyzeEquipmentAge(equipos);
    
    // Calcular necesidades de reemplazo
    const replacementNeeds = this.calculateReplacementNeeds(ageDistribution, timeHorizon);
    
    // Calcular necesidades de expansión
    const expansionNeeds = this.calculateExpansionNeeds(historicalPurchases, growthRate, timeHorizon);
    
    // Calcular necesidades de mantenimiento
    const maintenanceNeeds = this.calculateMaintenanceNeeds(equipos, timeHorizon);
    
    // Combinar predicciones
    const predictions = this.combinePredictions({
      replacement: replacementNeeds,
      expansion: expansionNeeds,
      maintenance: maintenanceNeeds
    }, timeHorizon);

    // Aplicar restricciones de presupuesto
    const budgetConstrainedPredictions = this.applyBudgetConstraints(predictions, budget);

    return {
      predictions: budgetConstrainedPredictions,
      confidence: this.calculateConfidence(equipos, historicalPurchases),
      factors: {
        age_distribution: ageDistribution,
        replacement_needs: replacementNeeds,
        expansion_needs: expansionNeeds,
        maintenance_needs: maintenanceNeeds
      },
      recommendations: this.generateEquipmentRecommendations(budgetConstrainedPredictions)
    };
  }

  // Analizar distribución de edad de equipos
  analyzeEquipmentAge(equipos) {
    const now = new Date();
    const ageGroups = {
      '0-2': 0,
      '2-4': 0,
      '4-6': 0,
      '6-8': 0,
      '8+': 0
    };

    equipos.forEach(equipo => {
      if (equipo.fecha_compra) {
        const age = (now - new Date(equipo.fecha_compra)) / (1000 * 60 * 60 * 24 * 365);
        
        if (age < 2) ageGroups['0-2']++;
        else if (age < 4) ageGroups['2-4']++;
        else if (age < 6) ageGroups['4-6']++;
        else if (age < 8) ageGroups['6-8']++;
        else ageGroups['8+']++;
      }
    });

    return ageGroups;
  }

  // Calcular necesidades de reemplazo
  calculateReplacementNeeds(ageDistribution, timeHorizon) {
    const replacementSchedule = [];
    
    for (let month = 1; month <= timeHorizon; month++) {
      let replacements = 0;
      
      // Equipos de 6-8 años: 20% probabilidad de reemplazo por mes
      replacements += Math.ceil(ageDistribution['6-8'] * 0.2 * (month / 12));
      
      // Equipos de 8+ años: 40% probabilidad de reemplazo por mes
      replacements += Math.ceil(ageDistribution['8+'] * 0.4 * (month / 12));
      
      replacementSchedule.push({
        month,
        replacements,
        priority: replacements > 5 ? 'high' : replacements > 2 ? 'medium' : 'low'
      });
    }

    return replacementSchedule;
  }

  // Calcular necesidades de expansión
  calculateExpansionNeeds(historicalPurchases, growthRate, timeHorizon) {
    const expansionSchedule = [];
    const avgMonthlyPurchases = historicalPurchases.reduce((a, b) => a + b, 0) / historicalPurchases.length;
    
    for (let month = 1; month <= timeHorizon; month++) {
      const growthFactor = 1 + (growthRate * month / 12);
      const expansionNeeds = Math.ceil(avgMonthlyPurchases * growthFactor - avgMonthlyPurchases);
      
      expansionSchedule.push({
        month,
        new_equipment: Math.max(0, expansionNeeds),
        growth_factor: growthFactor
      });
    }

    return expansionSchedule;
  }

  // Calcular necesidades de mantenimiento
  calculateMaintenanceNeeds(equipos, timeHorizon) {
    const maintenanceSchedule = [];
    
    for (let month = 1; month <= timeHorizon; month++) {
      let maintenanceCount = 0;
      let urgentCount = 0;
      
      equipos.forEach(equipo => {
        const lastMaintenance = this.getLastMaintenanceDate(equipo);
        const daysSinceMaintenance = (new Date() - lastMaintenance) / (1000 * 60 * 60 * 24);
        
        // Mantenimiento preventivo cada 6 meses
        if (daysSinceMaintenance > 180) {
          maintenanceCount++;
        }
        
        // Mantenimiento urgente para equipos en mal estado
        if (equipo.estado === 'Malo') {
          urgentCount++;
        }
      });
      
      maintenanceSchedule.push({
        month,
        preventive: maintenanceCount,
        urgent: urgentCount,
        total: maintenanceCount + urgentCount
      });
    }

    return maintenanceSchedule;
  }

  // Combinar predicciones
  combinePredictions(predictions, timeHorizon) {
    const combined = [];
    
    for (let month = 1; month <= timeHorizon; month++) {
      const monthData = {
        month,
        equipment_needed: 0,
        maintenance_required: 0,
        estimated_cost: 0,
        priority: 'low'
      };

      // Sumar equipos necesarios
      monthData.equipment_needed += predictions.replacement[month - 1]?.replacements || 0;
      monthData.equipment_needed += predictions.expansion[month - 1]?.new_equipment || 0;
      
      // Sumar mantenimientos necesarios
      monthData.maintenance_required += predictions.maintenance[month - 1]?.total || 0;
      
      // Calcular costo estimado (asumiendo $1000 por equipo, $200 por mantenimiento)
      monthData.estimated_cost = (monthData.equipment_needed * 1000) + (monthData.maintenance_required * 200);
      
      // Determinar prioridad
      if (monthData.equipment_needed > 10 || monthData.maintenance_required > 20) {
        monthData.priority = 'high';
      } else if (monthData.equipment_needed > 5 || monthData.maintenance_required > 10) {
        monthData.priority = 'medium';
      }

      combined.push(monthData);
    }

    return combined;
  }

  // Aplicar restricciones de presupuesto
  applyBudgetConstraints(predictions, budget) {
    const monthlyBudget = budget / 12;
    
    return predictions.map(prediction => {
      if (prediction.estimated_cost > monthlyBudget) {
        return {
          ...prediction,
          estimated_cost: monthlyBudget,
          budget_constrained: true,
          original_cost: prediction.estimated_cost
        };
      }
      return prediction;
    });
  }

  // Predecir demanda de software
  async predictSoftwareDemand(companyData, timeHorizon = 12) {
    const { software, currentUsage, growthRate, expirySchedule } = companyData;
    
    const predictions = [];
    
    for (let month = 1; month <= timeHorizon; month++) {
      const monthPrediction = {
        month,
        license_needed: 0,
        renewals_required: 0,
        new_software: 0,
        estimated_cost: 0
      };

      // Calcular licencias necesarias basadas en crecimiento
      software.forEach(sw => {
        const currentLicenses = sw.stock || 0;
        const usageRate = (sw.licencias_asignadas || 0) / currentLicenses;
        const growthFactor = 1 + (growthRate * month / 12);
        
        // Si el uso es alto, necesitamos más licencias
        if (usageRate > 0.8) {
          monthPrediction.license_needed += Math.ceil(currentLicenses * 0.2);
        }
        
        // Verificar renovaciones
        if (sw.fecha_vencimiento) {
          const expiryDate = new Date(sw.fecha_vencimiento);
          const monthsToExpiry = (expiryDate - new Date()) / (1000 * 60 * 60 * 24 * 30);
          
          if (monthsToExpiry <= month) {
            monthPrediction.renewals_required++;
          }
        }
      });

      // Calcular costo estimado
      monthPrediction.estimated_cost = 
        (monthPrediction.license_needed * 100) + // $100 por licencia nueva
        (monthPrediction.renewals_required * 50); // $50 por renovación

      predictions.push(monthPrediction);
    }

    return {
      predictions,
      confidence: this.calculateSoftwareConfidence(software, currentUsage),
      recommendations: this.generateSoftwareRecommendations(predictions)
    };
  }

  // Predecir demanda de mantenimiento
  async predictMaintenanceDemand(equipos, timeHorizon = 12) {
    const predictions = [];
    
    for (let month = 1; month <= timeHorizon; month++) {
      const monthPrediction = {
        month,
        preventive_maintenance: 0,
        corrective_maintenance: 0,
        urgent_repairs: 0,
        estimated_cost: 0,
        technician_hours: 0
      };

      equipos.forEach(equipo => {
        const age = this.getEquipmentAge(equipo);
        const lastMaintenance = this.getLastMaintenanceDate(equipo);
        const daysSinceMaintenance = (new Date() - lastMaintenance) / (1000 * 60 * 60 * 24);
        
        // Mantenimiento preventivo basado en edad y tiempo desde último mantenimiento
        if (daysSinceMaintenance > 180 || age > 3) {
          monthPrediction.preventive_maintenance++;
        }
        
        // Mantenimiento correctivo basado en estado
        if (equipo.estado === 'Regular') {
          monthPrediction.corrective_maintenance++;
        } else if (equipo.estado === 'Malo') {
          monthPrediction.urgent_repairs++;
        }
      });

      // Calcular costos y horas
      monthPrediction.estimated_cost = 
        (monthPrediction.preventive_maintenance * 150) +
        (monthPrediction.corrective_maintenance * 300) +
        (monthPrediction.urgent_repairs * 500);
      
      monthPrediction.technician_hours = 
        (monthPrediction.preventive_maintenance * 2) +
        (monthPrediction.corrective_maintenance * 4) +
        (monthPrediction.urgent_repairs * 8);

      predictions.push(monthPrediction);
    }

    return {
      predictions,
      confidence: this.calculateMaintenanceConfidence(equipos),
      recommendations: this.generateMaintenanceRecommendations(predictions)
    };
  }

  // Generar recomendaciones de equipos
  generateEquipmentRecommendations(predictions) {
    const recommendations = [];
    
    const highPriorityMonths = predictions.filter(p => p.priority === 'high');
    const totalCost = predictions.reduce((sum, p) => sum + p.estimated_cost, 0);
    const avgMonthlyCost = totalCost / predictions.length;

    if (highPriorityMonths.length > 0) {
      recommendations.push({
        type: 'urgent_planning',
        priority: 'high',
        title: 'Planificación Urgente Requerida',
        message: `${highPriorityMonths.length} meses requieren atención prioritaria`,
        actions: [
          'Revisar presupuesto para meses de alta demanda',
          'Planificar compras con anticipación',
          'Considerar contratos de mantenimiento preventivo'
        ]
      });
    }

    if (avgMonthlyCost > 5000) {
      recommendations.push({
        type: 'budget_optimization',
        priority: 'medium',
        title: 'Optimización de Presupuesto',
        message: `Costo promedio mensual: $${avgMonthlyCost.toFixed(2)}`,
        actions: [
          'Considerar compras a granel para descuentos',
          'Evaluar opciones de leasing',
          'Implementar programa de mantenimiento preventivo'
        ]
      });
    }

    return recommendations;
  }

  // Generar recomendaciones de software
  generateSoftwareRecommendations(predictions) {
    const recommendations = [];
    
    const totalRenewals = predictions.reduce((sum, p) => sum + p.renewals_required, 0);
    const totalNewLicenses = predictions.reduce((sum, p) => sum + p.license_needed, 0);

    if (totalRenewals > 0) {
      recommendations.push({
        type: 'license_renewal',
        priority: 'high',
        title: 'Renovaciones de Licencias',
        message: `${totalRenewals} licencias requieren renovación`,
        actions: [
          'Programar renovaciones con anticipación',
          'Negociar descuentos por renovación temprana',
          'Evaluar alternativas más económicas'
        ]
      });
    }

    if (totalNewLicenses > 0) {
      recommendations.push({
        type: 'license_expansion',
        priority: 'medium',
        title: 'Expansión de Licencias',
        message: `Se necesitan ${totalNewLicenses} nuevas licencias`,
        actions: [
          'Analizar patrones de uso actual',
          'Considerar licencias por usuario vs por dispositivo',
          'Evaluar opciones de licenciamiento en la nube'
        ]
      });
    }

    return recommendations;
  }

  // Generar recomendaciones de mantenimiento
  generateMaintenanceRecommendations(predictions) {
    const recommendations = [];
    
    const totalHours = predictions.reduce((sum, p) => sum + p.technician_hours, 0);
    const avgMonthlyHours = totalHours / predictions.length;

    if (avgMonthlyHours > 40) {
      recommendations.push({
        type: 'workload_management',
        priority: 'high',
        title: 'Gestión de Carga de Trabajo',
        message: `Promedio de ${avgMonthlyHours.toFixed(1)} horas de técnico por mes`,
        actions: [
          'Considerar contratar técnicos adicionales',
          'Implementar mantenimiento preventivo más frecuente',
          'Evaluar contratos con proveedores externos'
        ]
      });
    }

    const urgentMonths = predictions.filter(p => p.urgent_repairs > 5);
    if (urgentMonths.length > 0) {
      recommendations.push({
        type: 'preventive_strategy',
        priority: 'medium',
        title: 'Estrategia Preventiva',
        message: `${urgentMonths.length} meses con alta demanda de reparaciones urgentes`,
        actions: [
          'Implementar programa de mantenimiento preventivo',
          'Reemplazar equipos críticos antes de fallar',
          'Capacitar personal en mantenimiento básico'
        ]
      });
    }

    return recommendations;
  }

  // Calcular confianza de la predicción
  calculateConfidence(equipos, historicalPurchases) {
    const dataQuality = this.assessDataQuality(equipos, historicalPurchases);
    const historicalConsistency = this.assessHistoricalConsistency(historicalPurchases);
    
    return (dataQuality + historicalConsistency) / 2;
  }

  // Evaluar calidad de datos
  assessDataQuality(equipos, historicalPurchases) {
    let score = 0;
    
    // Verificar completitud de datos de equipos
    const completeData = equipos.filter(e => 
      e.fecha_compra && e.marca && e.modelo
    ).length;
    score += (completeData / equipos.length) * 0.5;
    
    // Verificar consistencia de datos históricos
    if (historicalPurchases.length > 6) {
      score += 0.5;
    }
    
    return Math.min(score, 1);
  }

  // Evaluar consistencia histórica
  assessHistoricalConsistency(historicalPurchases) {
    if (historicalPurchases.length < 3) return 0.3;
    
    const variance = this.calculateVariance(historicalPurchases);
    const avg = historicalPurchases.reduce((a, b) => a + b, 0) / historicalPurchases.length;
    const coefficient = variance / avg;
    
    // Menor coeficiente de variación = mayor consistencia
    return Math.max(0, 1 - coefficient);
  }

  // Calcular varianza
  calculateVariance(data) {
    const avg = data.reduce((a, b) => a + b, 0) / data.length;
    const variance = data.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / data.length;
    return Math.sqrt(variance);
  }

  // Calcular confianza para software
  calculateSoftwareConfidence(software, currentUsage) {
    const dataCompleteness = software.filter(s => 
      s.fecha_vencimiento && s.stock
    ).length / software.length;
    
    const usageDataQuality = currentUsage ? 0.8 : 0.4;
    
    return (dataCompleteness + usageDataQuality) / 2;
  }

  // Calcular confianza para mantenimiento
  calculateMaintenanceConfidence(equipos) {
    const maintenanceData = equipos.filter(e => 
      e.trazabilidad && e.trazabilidad.length > 0
    ).length;
    
    return maintenanceData / equipos.length;
  }

  // Obtener fecha del último mantenimiento
  getLastMaintenanceDate(equipo) {
    const mantenimientos = equipo.trazabilidad?.filter(log => 
      log.accion === 'Mantenimiento'
    ) || [];

    if (mantenimientos.length === 0) {
      return new Date(equipo.fecha_compra || new Date());
    }

    return new Date(
      mantenimientos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0].fecha
    );
  }

  // Obtener edad del equipo
  getEquipmentAge(equipo) {
    if (!equipo.fecha_compra) return 0;
    
    return (new Date() - new Date(equipo.fecha_compra)) / (1000 * 60 * 60 * 24 * 365);
  }

  // Obtener resumen de predicciones
  getPredictionSummary(predictions) {
    const totalCost = predictions.reduce((sum, p) => sum + p.estimated_cost, 0);
    const highPriorityMonths = predictions.filter(p => p.priority === 'high').length;
    const avgMonthlyCost = totalCost / predictions.length;

    return {
      total_cost: totalCost,
      average_monthly_cost: avgMonthlyCost,
      high_priority_months: highPriorityMonths,
      planning_horizon: predictions.length,
      budget_recommendation: avgMonthlyCost * 1.2 // 20% buffer
    };
  }
}

// Instancia global del motor de predicción
export const demandPredictionEngine = new DemandPredictionEngine();
