import React, { useState, useEffect } from 'react';
import { 
  SparklesIcon, 
  LightBulbIcon, 
  ExclamationTriangleIcon,
  ChartBarIcon,
  CogIcon,
  ChatBubbleLeftRightIcon,
  ArrowTrendingUpIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { anomalyDetector } from '../../lib/anomalyDetection';
import { recommendationEngine } from '../../lib/recommendationEngine';
import { demandPredictionEngine } from '../../lib/demandPrediction';
import { workflowEngine } from '../../lib/workflowEngine';

const AIDashboard = ({ companyData }) => {
  const [anomalies, setAnomalies] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [predictions, setPredictions] = useState(null);
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAIData();
  }, [companyData]);

  const loadAIData = async () => {
    setLoading(true);
    try {
      // Cargar anomalías
      const equipmentAnomalies = await anomalyDetector.detectEquipmentAnomalies(
        companyData.equipos?.[0] || {}, 
        companyData.equipos || []
      );
      const softwareAnomalies = await anomalyDetector.detectSoftwareAnomalies(
        companyData.software?.[0] || {}, 
        companyData.software || []
      );
      const costAnomalies = await anomalyDetector.detectCostAnomalies(companyData);
      
      setAnomalies([...equipmentAnomalies, ...softwareAnomalies, ...costAnomalies]);

      // Cargar recomendaciones
      const equipmentRecs = await recommendationEngine.generateEquipmentRecommendations(
        companyData.equipos?.[0] || {}, 
        companyData
      );
      const softwareRecs = await recommendationEngine.generateSoftwareRecommendations(
        companyData.software?.[0] || {}, 
        companyData
      );
      const costRecs = await recommendationEngine.generateCostRecommendations(companyData);
      
      setRecommendations([...equipmentRecs, ...softwareRecs, ...costRecs]);

      // Cargar predicciones
      const equipmentPredictions = await demandPredictionEngine.predictEquipmentDemand(companyData);
      const softwarePredictions = await demandPredictionEngine.predictSoftwareDemand(companyData);
      const maintenancePredictions = await demandPredictionEngine.predictMaintenanceDemand(
        companyData.equipos || []
      );
      
      setPredictions({
        equipment: equipmentPredictions,
        software: softwarePredictions,
        maintenance: maintenancePredictions
      });

      // Cargar workflows
      setWorkflows(workflowEngine.getActiveWorkflows());

    } catch (error) {
      console.error('Error loading AI data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Cargando datos de IA...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center">
              <SparklesIcon className="h-8 w-8 mr-3" />
              Dashboard de IA
            </h2>
            <p className="text-blue-100 mt-1">
              Automatización inteligente y análisis predictivo
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">
              {anomalies.length + recommendations.length}
            </div>
            <div className="text-blue-100">Insights activos</div>
          </div>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Anomalías</p>
              <p className="text-2xl font-bold text-gray-900">
                {anomalies.filter(a => a.severity === 'high').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <LightBulbIcon className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Recomendaciones</p>
              <p className="text-2xl font-bold text-gray-900">{recommendations.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Workflows</p>
              <p className="text-2xl font-bold text-gray-900">{workflows.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <ArrowTrendingUpIcon className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Predicciones</p>
              <p className="text-2xl font-bold text-gray-900">
                {predictions ? 'Activas' : '0'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Anomalías detectadas */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-red-500" />
            Anomalías Detectadas
          </h3>
        </div>
        <div className="p-6">
          {anomalies.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ExclamationTriangleIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No se detectaron anomalías en este momento</p>
            </div>
          ) : (
            <div className="space-y-4">
              {anomalies.slice(0, 5).map((anomaly, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(anomaly.severity)}`}>
                          {anomaly.severity}
                        </span>
                        <span className="text-sm text-gray-500">{anomaly.type}</span>
                      </div>
                      <p className="text-sm text-gray-900 mb-2">{anomaly.message}</p>
                      <p className="text-xs text-gray-600">{anomaly.recommendation}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">
                        Confianza: {(anomaly.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {anomalies.length > 5 && (
                <div className="text-center">
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    Ver {anomalies.length - 5} anomalías más
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recomendaciones */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <LightBulbIcon className="h-5 w-5 mr-2 text-yellow-500" />
            Recomendaciones Inteligentes
          </h3>
        </div>
        <div className="p-6">
          {recommendations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <LightBulbIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No hay recomendaciones disponibles en este momento</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recommendations.slice(0, 5).map((rec, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(rec.priority)}`}>
                          {rec.priority}
                        </span>
                        <span className="text-sm text-gray-500">{rec.type}</span>
                      </div>
                      <h4 className="font-medium text-gray-900 mb-1">{rec.title}</h4>
                      <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                      {rec.actions && rec.actions.length > 0 && (
                        <div className="flex space-x-2">
                          {rec.actions.slice(0, 2).map((action, actionIndex) => (
                            <button
                              key={actionIndex}
                              className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded transition-colors"
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">
                        Confianza: {(rec.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {recommendations.length > 5 && (
                <div className="text-center">
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    Ver {recommendations.length - 5} recomendaciones más
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Predicciones */}
      {predictions && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <ArrowTrendingUpIcon className="h-5 w-5 mr-2 text-green-500" />
              Predicciones de Demanda
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {predictions.equipment.predictions.reduce((sum, p) => sum + p.equipment_needed, 0)}
                </div>
                <div className="text-sm text-gray-500">Equipos necesarios (12 meses)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {predictions.maintenance.predictions.reduce((sum, p) => sum + p.preventive_maintenance, 0)}
                </div>
                <div className="text-sm text-gray-500">Mantenimientos preventivos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  ${predictions.equipment.predictions.reduce((sum, p) => sum + p.estimated_cost, 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">Costo estimado (12 meses)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workflows activos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <CogIcon className="h-5 w-5 mr-2 text-gray-500" />
            Workflows Automáticos
          </h3>
        </div>
        <div className="p-6">
          {workflows.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CogIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No hay workflows activos</p>
            </div>
          ) : (
            <div className="space-y-3">
              {workflows.map((workflow, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">{workflow.name}</h4>
                    <p className="text-sm text-gray-600">{workflow.description}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      Activo
                    </span>
                    <button className="text-blue-600 hover:text-blue-800 text-sm">
                      Configurar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIDashboard;
