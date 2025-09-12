// Motor de recomendaciones inteligentes
export class RecommendationEngine {
  constructor() {
    this.recommendations = new Map();
    this.userPreferences = new Map();
    this.learningData = new Map();
  }

  // Generar recomendaciones para un equipo
  async generateEquipmentRecommendations(equipment, context = {}) {
    const recommendations = [];

    // Recomendación de mantenimiento preventivo
    const maintenanceRec = this.recommendMaintenance(equipment, context);
    if (maintenanceRec) recommendations.push(maintenanceRec);

    // Recomendación de reemplazo
    const replacementRec = this.recommendReplacement(equipment, context);
    if (replacementRec) recommendations.push(replacementRec);

    // Recomendación de optimización
    const optimizationRec = this.recommendOptimization(equipment, context);
    if (optimizationRec) recommendations.push(optimizationRec);

    // Recomendación de actualización
    const upgradeRec = this.recommendUpgrade(equipment, context);
    if (upgradeRec) recommendations.push(upgradeRec);

    return recommendations;
  }

  // Recomendar mantenimiento preventivo
  recommendMaintenance(equipment, context) {
    const ageInYears = equipment.fecha_compra ? 
      (new Date() - new Date(equipment.fecha_compra)) / (1000 * 60 * 60 * 24 * 365) : 0;

    const lastMaintenance = equipment.trazabilidad?.filter(log => 
      log.accion === 'Mantenimiento'
    ).sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0];

    const daysSinceMaintenance = lastMaintenance ? 
      (new Date() - new Date(lastMaintenance.fecha)) / (1000 * 60 * 60 * 24) : 999;

    // Recomendar mantenimiento basado en edad y tiempo desde último mantenimiento
    if (ageInYears > 2 && daysSinceMaintenance > 180) {
      return {
        type: 'maintenance',
        priority: 'high',
        title: 'Mantenimiento Preventivo Recomendado',
        description: `El equipo ${equipment.marca} ${equipment.modelo} no ha recibido mantenimiento en ${Math.floor(daysSinceMaintenance)} días`,
        reasoning: [
          `Edad del equipo: ${ageInYears.toFixed(1)} años`,
          `Último mantenimiento: ${Math.floor(daysSinceMaintenance)} días atrás`,
          'Mantenimiento preventivo puede prevenir fallas costosas'
        ],
        actions: [
          {
            type: 'schedule_maintenance',
            label: 'Programar Mantenimiento',
            params: { equipment_id: equipment.id, type: 'preventive' }
          },
          {
            type: 'create_workflow',
            label: 'Crear Workflow de Mantenimiento',
            params: { workflow_type: 'maintenance_required' }
          }
        ],
        estimated_impact: {
          cost_savings: 'Prevenir fallas costosas',
          downtime_reduction: 'Reducir tiempo de inactividad',
          reliability: 'Mejorar confiabilidad del equipo'
        },
        confidence: 0.8
      };
    }

    return null;
  }

  // Recomendar reemplazo de equipo
  recommendReplacement(equipment, context) {
    const ageInYears = equipment.fecha_compra ? 
      (new Date() - new Date(equipment.fecha_compra)) / (1000 * 60 * 60 * 24 * 365) : 0;

    const maintenanceCosts = equipment.trazabilidad?.filter(log => 
      log.accion === 'Mantenimiento' && log.costo
    ).map(log => parseFloat(log.costo)) || [];

    const totalMaintenanceCost = maintenanceCosts.reduce((a, b) => a + b, 0);
    const avgMaintenanceCost = maintenanceCosts.length > 0 ? 
      totalMaintenanceCost / maintenanceCosts.length : 0;

    const originalCost = parseFloat(equipment.costo) || 0;
    const maintenanceRatio = originalCost > 0 ? totalMaintenanceCost / originalCost : 0;

    // Recomendar reemplazo si el equipo es muy viejo o costoso de mantener
    if (ageInYears > 5 || maintenanceRatio > 0.5) {
      return {
        type: 'replacement',
        priority: ageInYears > 7 ? 'high' : 'medium',
        title: 'Reemplazo de Equipo Recomendado',
        description: `El equipo ${equipment.marca} ${equipo.modelo} ha alcanzado el final de su vida útil efectiva`,
        reasoning: [
          `Edad del equipo: ${ageInYears.toFixed(1)} años`,
          `Costo de mantenimiento: $${totalMaintenanceCost.toFixed(2)} (${(maintenanceRatio * 100).toFixed(1)}% del costo original)`,
          'Equipos más nuevos ofrecen mejor rendimiento y eficiencia energética'
        ],
        actions: [
          {
            type: 'create_approval_request',
            label: 'Solicitar Aprobación de Reemplazo',
            params: { 
              equipment_id: equipment.id, 
              reason: 'end_of_life',
              estimated_cost: originalCost * 0.8 // Estimación conservadora
            }
          },
          {
            type: 'generate_report',
            label: 'Generar Reporte de Reemplazo',
            params: { 
              type: 'replacement_analysis',
              equipment_id: equipment.id 
            }
          }
        ],
        estimated_impact: {
          cost_savings: 'Reducir costos de mantenimiento',
          performance: 'Mejorar rendimiento y eficiencia',
          reliability: 'Aumentar confiabilidad'
        },
        confidence: 0.9
      };
    }

    return null;
  }

  // Recomendar optimización
  recommendOptimization(equipment, context) {
    const { companyData } = context;
    
    // Analizar si el equipo está siendo subutilizado
    const recentActivity = equipment.trazabilidad?.slice(-10) || [];
    const activityScore = recentActivity.length;

    if (activityScore < 3 && equipment.estado === 'Bueno') {
      return {
        type: 'optimization',
        priority: 'medium',
        title: 'Optimización de Uso Recomendada',
        description: `El equipo ${equipment.marca} ${equipment.modelo} parece estar subutilizado`,
        reasoning: [
          `Actividad reciente: ${activityScore} eventos en los últimos registros`,
          'El equipo está en buen estado pero con poca actividad',
          'Podría ser reasignado o optimizado para mejor uso'
        ],
        actions: [
          {
            type: 'analyze_usage',
            label: 'Analizar Patrones de Uso',
            params: { equipment_id: equipment.id }
          },
          {
            type: 'suggest_reassignment',
            label: 'Sugerir Reasignación',
            params: { equipment_id: equipment.id }
          }
        ],
        estimated_impact: {
          utilization: 'Mejorar utilización de recursos',
          efficiency: 'Optimizar distribución de equipos',
          cost_optimization: 'Reducir costos operativos'
        },
        confidence: 0.6
      };
    }

    return null;
  }

  // Recomendar actualización
  recommendUpgrade(equipment, context) {
    const ageInYears = equipment.fecha_compra ? 
      (new Date() - new Date(equipment.fecha_compra)) / (1000 * 60 * 60 * 24 * 365) : 0;

    // Recomendar actualización de software o componentes
    if (ageInYears > 3 && ageInYears < 5) {
      return {
        type: 'upgrade',
        priority: 'medium',
        title: 'Actualización de Equipo Recomendada',
        description: `El equipo ${equipment.marca} ${equipment.modelo} podría beneficiarse de una actualización`,
        reasoning: [
          `Edad del equipo: ${ageInYears.toFixed(1)} años`,
          'Actualizaciones pueden extender la vida útil del equipo',
          'Mejoras en rendimiento y compatibilidad'
        ],
        actions: [
          {
            type: 'research_upgrades',
            label: 'Investigar Opciones de Actualización',
            params: { equipment_id: equipment.id }
          },
          {
            type: 'cost_benefit_analysis',
            label: 'Análisis Costo-Beneficio',
            params: { equipment_id: equipment.id }
          }
        ],
        estimated_impact: {
          performance: 'Mejorar rendimiento',
          compatibility: 'Mantener compatibilidad con software actual',
          lifespan: 'Extender vida útil del equipo'
        },
        confidence: 0.7
      };
    }

    return null;
  }

  // Generar recomendaciones de software
  async generateSoftwareRecommendations(software, context = {}) {
    const recommendations = [];

    // Recomendación de optimización de licencias
    const licenseRec = this.recommendLicenseOptimization(software, context);
    if (licenseRec) recommendations.push(licenseRec);

    // Recomendación de actualización
    const updateRec = this.recommendSoftwareUpdate(software, context);
    if (updateRec) recommendations.push(updateRec);

    // Recomendación de consolidación
    const consolidationRec = this.recommendConsolidation(software, context);
    if (consolidationRec) recommendations.push(consolidationRec);

    return recommendations;
  }

  // Recomendar optimización de licencias
  recommendLicenseOptimization(software, context) {
    const { stock, licencias_asignadas } = software;
    const usageRate = licencias_asignadas / stock;

    if (usageRate < 0.5 && stock > 3) {
      return {
        type: 'license_optimization',
        priority: 'medium',
        title: 'Optimización de Licencias Recomendada',
        description: `Las licencias de ${software.nombre} están subutilizadas`,
        reasoning: [
          `Uso actual: ${(usageRate * 100).toFixed(1)}% de las licencias`,
          `Licencias disponibles: ${stock - licencias_asignadas}`,
          'Reducir stock puede generar ahorros significativos'
        ],
        actions: [
          {
            type: 'analyze_usage_patterns',
            label: 'Analizar Patrones de Uso',
            params: { software_id: software.id }
          },
          {
            type: 'suggest_license_reduction',
            label: 'Sugerir Reducción de Licencias',
            params: { 
              software_id: software.id,
              suggested_reduction: Math.floor((stock - licencias_asignadas) * 0.5)
            }
          }
        ],
        estimated_impact: {
          cost_savings: `Ahorro estimado: $${((stock - licencias_asignadas) * 100).toFixed(2)}/año`,
          optimization: 'Mejorar eficiencia de licencias'
        },
        confidence: 0.8
      };
    }

    return null;
  }

  // Recomendar actualización de software
  recommendSoftwareUpdate(software, context) {
    const daysToExpiry = software.fecha_vencimiento ? 
      (new Date(software.fecha_vencimiento) - new Date()) / (1000 * 60 * 60 * 24) : 999;

    if (daysToExpiry < 90) {
      return {
        type: 'software_update',
        priority: daysToExpiry < 30 ? 'high' : 'medium',
        title: 'Actualización de Software Recomendada',
        description: `La licencia de ${software.nombre} vence en ${Math.ceil(daysToExpiry)} días`,
        reasoning: [
          `Fecha de vencimiento: ${software.fecha_vencimiento}`,
          'Actualización asegura continuidad del servicio',
          'Nuevas versiones pueden incluir mejoras de seguridad'
        ],
        actions: [
          {
            type: 'renew_license',
            label: 'Renovar Licencia',
            params: { software_id: software.id }
          },
          {
            type: 'evaluate_alternatives',
            label: 'Evaluar Alternativas',
            params: { software_id: software.id }
          }
        ],
        estimated_impact: {
          continuity: 'Asegurar continuidad del servicio',
          security: 'Mantener actualizaciones de seguridad',
          features: 'Acceso a nuevas funcionalidades'
        },
        confidence: 1.0
      };
    }

    return null;
  }

  // Recomendar consolidación de software
  recommendConsolidation(software, context) {
    const { similarSoftware } = context;
    
    if (similarSoftware && similarSoftware.length > 1) {
      return {
        type: 'consolidation',
        priority: 'low',
        title: 'Consolidación de Software Recomendada',
        description: `Se detectaron ${similarSoftware.length} software similares que podrían consolidarse`,
        reasoning: [
          'Múltiples software con funcionalidades similares',
          'Consolidación puede reducir costos y complejidad',
          'Mejor gestión y mantenimiento'
        ],
        actions: [
          {
            type: 'compare_software',
            label: 'Comparar Software Similares',
            params: { software_ids: similarSoftware.map(s => s.id) }
          },
          {
            type: 'consolidation_analysis',
            label: 'Análisis de Consolidación',
            params: { software_ids: similarSoftware.map(s => s.id) }
          }
        ],
        estimated_impact: {
          cost_reduction: 'Reducir costos de licencias',
          simplification: 'Simplificar gestión de software',
          maintenance: 'Facilitar mantenimiento'
        },
        confidence: 0.6
      };
    }

    return null;
  }

  // Generar recomendaciones de costos
  async generateCostRecommendations(companyData, context = {}) {
    const recommendations = [];

    // Análisis de presupuesto
    const budgetRec = this.analyzeBudget(companyData);
    if (budgetRec) recommendations.push(budgetRec);

    // Análisis de tendencias
    const trendRec = this.analyzeCostTrends(companyData);
    if (trendRec) recommendations.push(trendRec);

    // Análisis de ROI
    const roiRec = this.analyzeROI(companyData);
    if (roiRec) recommendations.push(roiRec);

    return recommendations;
  }

  // Analizar presupuesto
  analyzeBudget(companyData) {
    const { monthlyCosts, budget, projectedCosts } = companyData;
    
    if (!monthlyCosts || !budget) return null;

    const currentMonthCost = monthlyCosts[monthlyCosts.length - 1];
    const budgetUtilization = (currentMonthCost / budget) * 100;

    if (budgetUtilization > 90) {
      return {
        type: 'budget_alert',
        priority: 'high',
        title: 'Alerta de Presupuesto',
        description: `El presupuesto está ${budgetUtilization.toFixed(1)}% utilizado`,
        reasoning: [
          `Gasto actual: $${currentMonthCost.toFixed(2)}`,
          `Presupuesto: $${budget.toFixed(2)}`,
          'Riesgo de exceder el presupuesto mensual'
        ],
        actions: [
          {
            type: 'review_expenses',
            label: 'Revisar Gastos',
            params: { month: new Date().toISOString().slice(0, 7) }
          },
          {
            type: 'adjust_budget',
            label: 'Ajustar Presupuesto',
            params: { current_budget: budget }
          }
        ],
        estimated_impact: {
          budget_control: 'Mejorar control de presupuesto',
          cost_optimization: 'Identificar oportunidades de ahorro'
        },
        confidence: 0.9
      };
    }

    return null;
  }

  // Analizar tendencias de costos
  analyzeCostTrends(companyData) {
    const { monthlyCosts } = companyData;
    
    if (!monthlyCosts || monthlyCosts.length < 6) return null;

    const recentMonths = monthlyCosts.slice(-3);
    const earlierMonths = monthlyCosts.slice(-6, -3);
    
    const recentAvg = recentMonths.reduce((a, b) => a + b, 0) / recentMonths.length;
    const earlierAvg = earlierMonths.reduce((a, b) => a + b, 0) / earlierMonths.length;
    
    const trend = (recentAvg - earlierAvg) / earlierAvg;

    if (Math.abs(trend) > 0.15) {
      return {
        type: 'cost_trend',
        priority: Math.abs(trend) > 0.3 ? 'high' : 'medium',
        title: `Tendencia de Costos ${trend > 0 ? 'Creciente' : 'Decreciente'}`,
        description: `Los costos han ${trend > 0 ? 'aumentado' : 'disminuido'} ${(Math.abs(trend) * 100).toFixed(1)}% en los últimos 3 meses`,
        reasoning: [
          `Promedio reciente: $${recentAvg.toFixed(2)}`,
          `Promedio anterior: $${earlierAvg.toFixed(2)}`,
          `Cambio: ${(trend * 100).toFixed(1)}%`
        ],
        actions: [
          {
            type: 'analyze_cost_drivers',
            label: 'Analizar Factores de Costo',
            params: { trend_direction: trend > 0 ? 'increasing' : 'decreasing' }
          },
          {
            type: 'create_cost_forecast',
            label: 'Crear Pronóstico de Costos',
            params: { months_ahead: 6 }
          }
        ],
        estimated_impact: {
          cost_control: 'Mejorar control de costos',
          planning: 'Mejorar planificación financiera',
          optimization: 'Identificar oportunidades de optimización'
        },
        confidence: 0.8
      };
    }

    return null;
  }

  // Analizar ROI
  analyzeROI(companyData) {
    const { investments, returns } = companyData;
    
    if (!investments || !returns) return null;

    const totalInvestment = investments.reduce((a, b) => a + b, 0);
    const totalReturn = returns.reduce((a, b) => a + b, 0);
    const roi = totalInvestment > 0 ? (totalReturn - totalInvestment) / totalInvestment : 0;

    if (roi < 0.1) {
      return {
        type: 'roi_optimization',
        priority: 'medium',
        title: 'Optimización de ROI Recomendada',
        description: `El ROI actual es ${(roi * 100).toFixed(1)}%, por debajo del objetivo`,
        reasoning: [
          `Inversión total: $${totalInvestment.toFixed(2)}`,
          `Retorno total: $${totalReturn.toFixed(2)}`,
          `ROI: ${(roi * 100).toFixed(1)}%`
        ],
        actions: [
          {
            type: 'analyze_investments',
            label: 'Analizar Inversiones',
            params: { investment_data: investments }
          },
          {
            type: 'optimize_portfolio',
            label: 'Optimizar Portafolio',
            params: { target_roi: 0.15 }
          }
        ],
        estimated_impact: {
          roi_improvement: 'Mejorar retorno de inversión',
          cost_efficiency: 'Aumentar eficiencia de costos',
          value_creation: 'Crear más valor con menos recursos'
        },
        confidence: 0.7
      };
    }

    return null;
  }

  // Obtener recomendaciones personalizadas
  getPersonalizedRecommendations(userId, context = {}) {
    const userPrefs = this.userPreferences.get(userId) || {};
    const recommendations = [];

    // Aplicar filtros basados en preferencias del usuario
    if (userPrefs.priority === 'cost_savings') {
      // Priorizar recomendaciones de ahorro de costos
    }

    if (userPrefs.priority === 'performance') {
      // Priorizar recomendaciones de rendimiento
    }

    return recommendations;
  }

  // Aprender de las acciones del usuario
  learnFromAction(userId, recommendationId, action, outcome) {
    if (!this.learningData.has(userId)) {
      this.learningData.set(userId, []);
    }

    this.learningData.get(userId).push({
      recommendationId,
      action,
      outcome,
      timestamp: new Date()
    });
  }

  // Obtener métricas de recomendaciones
  getRecommendationMetrics() {
    const totalRecommendations = Array.from(this.learningData.values())
      .flat().length;
    
    const acceptedRecommendations = Array.from(this.learningData.values())
      .flat().filter(record => record.outcome === 'accepted').length;

    const acceptanceRate = totalRecommendations > 0 ? 
      acceptedRecommendations / totalRecommendations : 0;

    return {
      total_recommendations: totalRecommendations,
      accepted_recommendations: acceptedRecommendations,
      acceptance_rate: acceptanceRate,
      learning_data_points: Array.from(this.learningData.values())
        .flat().length
    };
  }
}

// Instancia global del motor de recomendaciones
export const recommendationEngine = new RecommendationEngine();
