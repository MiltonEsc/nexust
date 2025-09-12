// Motor de workflows para automatización
export class WorkflowEngine {
  constructor() {
    this.workflows = new Map();
    this.runningWorkflows = new Map();
    this.eventListeners = new Map();
  }

  // Registrar un nuevo workflow
  registerWorkflow(id, config) {
    this.workflows.set(id, {
      id,
      name: config.name,
      description: config.description,
      triggers: config.triggers || [],
      steps: config.steps || [],
      conditions: config.conditions || [],
      actions: config.actions || [],
      isActive: config.isActive || false,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  // Ejecutar un workflow
  async executeWorkflow(workflowId, context = {}) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || !workflow.isActive) {
      throw new Error(`Workflow ${workflowId} not found or inactive`);
    }

    const executionId = `${workflowId}_${Date.now()}`;
    const execution = {
      id: executionId,
      workflowId,
      status: 'running',
      context,
      currentStep: 0,
      results: [],
      startedAt: new Date(),
      completedAt: null
    };

    this.runningWorkflows.set(executionId, execution);

    try {
      // Ejecutar pasos del workflow
      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        execution.currentStep = i;
        
        // Verificar condiciones
        if (step.conditions && !this.evaluateConditions(step.conditions, context)) {
          continue;
        }

        // Ejecutar acción
        const result = await this.executeStep(step, context);
        execution.results.push({
          step: i,
          action: step.action,
          result,
          timestamp: new Date()
        });

        // Actualizar contexto
        context = { ...context, ...result };
      }

      execution.status = 'completed';
      execution.completedAt = new Date();
      
      // Ejecutar acciones finales
      if (workflow.actions) {
        await this.executeActions(workflow.actions, context);
      }

    } catch (error) {
      execution.status = 'failed';
      execution.error = error.message;
      execution.completedAt = new Date();
      throw error;
    }

    return execution;
  }

  // Evaluar condiciones
  evaluateConditions(conditions, context) {
    return conditions.every(condition => {
      const { field, operator, value } = condition;
      const fieldValue = this.getNestedValue(context, field);
      
      switch (operator) {
        case 'equals':
          return fieldValue === value;
        case 'not_equals':
          return fieldValue !== value;
        case 'greater_than':
          return fieldValue > value;
        case 'less_than':
          return fieldValue < value;
        case 'contains':
          return fieldValue && fieldValue.toString().includes(value);
        case 'in':
          return Array.isArray(value) && value.includes(fieldValue);
        default:
          return false;
      }
    });
  }

  // Ejecutar un paso del workflow
  async executeStep(step, context) {
    const { action, params = {} } = step;
    
    switch (action) {
      case 'send_notification':
        return await this.sendNotification(params, context);
      case 'create_approval_request':
        return await this.createApprovalRequest(params, context);
      case 'update_status':
        return await this.updateStatus(params, context);
      case 'generate_report':
        return await this.generateReport(params, context);
      case 'schedule_maintenance':
        return await this.scheduleMaintenance(params, context);
      case 'assign_task':
        return await this.assignTask(params, context);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  // Ejecutar acciones finales
  async executeActions(actions, context) {
    for (const action of actions) {
      await this.executeStep({ action: action.type, params: action.params }, context);
    }
  }

  // Obtener valor anidado del contexto
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // Acciones específicas
  async sendNotification(params, context) {
    const { type, recipients, message, data } = params;
    // Implementar envío de notificaciones
    console.log(`Sending ${type} notification to ${recipients}: ${message}`);
    return { notificationSent: true, recipients, message };
  }

  async createApprovalRequest(params, context) {
    const { approver, item, reason, priority = 'medium' } = params;
    // Implementar creación de solicitud de aprobación
    console.log(`Creating approval request for ${item} to ${approver}`);
    return { approvalRequestId: `approval_${Date.now()}`, approver, item };
  }

  async updateStatus(params, context) {
    const { itemId, newStatus, reason } = params;
    // Implementar actualización de estado
    console.log(`Updating ${itemId} status to ${newStatus}`);
    return { itemId, newStatus, updated: true };
  }

  async generateReport(params, context) {
    const { type, filters, format = 'pdf' } = params;
    // Implementar generación de reportes
    console.log(`Generating ${type} report in ${format} format`);
    return { reportId: `report_${Date.now()}`, type, format };
  }

  async scheduleMaintenance(params, context) {
    const { equipmentId, maintenanceType, scheduledDate, technician } = params;
    // Implementar programación de mantenimiento
    console.log(`Scheduling ${maintenanceType} for ${equipmentId} on ${scheduledDate}`);
    return { maintenanceId: `maint_${Date.now()}`, equipmentId, scheduledDate };
  }

  async assignTask(params, context) {
    const { taskId, assignee, priority, dueDate } = params;
    // Implementar asignación de tareas
    console.log(`Assigning task ${taskId} to ${assignee}`);
    return { taskId, assignee, assigned: true };
  }

  // Obtener workflows activos
  getActiveWorkflows() {
    return Array.from(this.workflows.values()).filter(w => w.isActive);
  }

  // Obtener ejecuciones en curso
  getRunningExecutions() {
    return Array.from(this.runningWorkflows.values());
  }

  // Activar/desactivar workflow
  toggleWorkflow(workflowId, isActive) {
    const workflow = this.workflows.get(workflowId);
    if (workflow) {
      workflow.isActive = isActive;
      workflow.updatedAt = new Date();
    }
  }
}

// Instancia global del motor de workflows
export const workflowEngine = new WorkflowEngine();

// Workflows predefinidos
export const predefinedWorkflows = {
  // Workflow para equipos que requieren mantenimiento
  maintenanceRequired: {
    id: 'maintenance_required',
    name: 'Mantenimiento Requerido',
    description: 'Automatiza el proceso cuando un equipo requiere mantenimiento',
    triggers: ['equipment_status_changed'],
    steps: [
      {
        action: 'create_approval_request',
        params: {
          approver: 'maintenance_manager',
          item: 'equipment_maintenance',
          reason: 'Equipment requires maintenance',
          priority: 'high'
        },
        conditions: [
          { field: 'equipment.status', operator: 'equals', value: 'maintenance_required' }
        ]
      },
      {
        action: 'send_notification',
        params: {
          type: 'email',
          recipients: ['maintenance_team'],
          message: 'Equipment requires immediate maintenance attention'
        }
      },
      {
        action: 'schedule_maintenance',
        params: {
          maintenanceType: 'preventive',
          scheduledDate: 'next_business_day'
        }
      }
    ],
    actions: [
      {
        type: 'update_status',
        params: {
          itemId: 'equipment_id',
          newStatus: 'maintenance_scheduled'
        }
      }
    ]
  },

  // Workflow para equipos obsoletos
  obsoleteEquipment: {
    id: 'obsolete_equipment',
    name: 'Equipo Obsoleto',
    description: 'Maneja equipos que han alcanzado su vida útil',
    triggers: ['equipment_age_check'],
    steps: [
      {
        action: 'create_approval_request',
        params: {
          approver: 'it_manager',
          item: 'equipment_replacement',
          reason: 'Equipment has reached end of life',
          priority: 'medium'
        },
        conditions: [
          { field: 'equipment.age_years', operator: 'greater_than', value: 5 }
        ]
      },
      {
        action: 'generate_report',
        params: {
          type: 'replacement_recommendation',
          filters: { equipment_id: 'equipment_id' }
        }
      }
    ]
  },

  // Workflow para licencias por vencer
  licenseExpiring: {
    id: 'license_expiring',
    name: 'Licencia por Vencer',
    description: 'Gestiona licencias de software próximas a vencer',
    triggers: ['license_expiry_check'],
    steps: [
      {
        action: 'send_notification',
        params: {
          type: 'email',
          recipients: ['software_manager'],
          message: 'Software license expiring soon'
        },
        conditions: [
          { field: 'license.days_to_expiry', operator: 'less_than', value: 30 }
        ]
      },
      {
        action: 'create_approval_request',
        params: {
          approver: 'procurement_manager',
          item: 'license_renewal',
          reason: 'License renewal required',
          priority: 'high'
        }
      }
    ]
  }
};

// Registrar workflows predefinidos
Object.values(predefinedWorkflows).forEach(workflow => {
  workflowEngine.registerWorkflow(workflow.id, workflow);
});
