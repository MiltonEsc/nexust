// Sistema de chatbot inteligente para consultas
export class Chatbot {
  constructor() {
    this.conversations = new Map();
    this.knowledgeBase = new Map();
    this.intentPatterns = new Map();
    this.initializeKnowledgeBase();
    this.initializeIntentPatterns();
  }

  // Inicializar base de conocimiento
  initializeKnowledgeBase() {
    this.knowledgeBase.set('equipment_status', {
      patterns: ['estado', 'status', 'condición', 'funcionamiento'],
      responses: {
        'Bueno': 'El equipo está funcionando correctamente y en buen estado.',
        'Regular': 'El equipo funciona pero puede requerir atención pronto.',
        'Malo': 'El equipo tiene problemas y necesita mantenimiento urgente.',
        'En reparación': 'El equipo está siendo reparado actualmente.'
      }
    });

    this.knowledgeBase.set('maintenance', {
      patterns: ['mantenimiento', 'reparación', 'reparar', 'arreglar'],
      responses: {
        'schedule': 'Para programar mantenimiento, ve a la sección de Mantenimiento y crea una nueva tarea.',
        'urgent': 'Para mantenimiento urgente, contacta al técnico asignado o crea una solicitud de alta prioridad.',
        'preventive': 'El mantenimiento preventivo se programa automáticamente según el calendario del equipo.'
      }
    });

    this.knowledgeBase.set('inventory', {
      patterns: ['inventario', 'equipos', 'dispositivos', 'activos'],
      responses: {
        'search': 'Puedes buscar equipos usando la barra de búsqueda en la página de Inventario.',
        'add': 'Para agregar un nuevo equipo, haz clic en el botón "Agregar" en la página de Inventario.',
        'edit': 'Para editar un equipo, haz clic en el ícono de editar en la lista de equipos.',
        'delete': 'Para eliminar un equipo, haz clic en el ícono de eliminar y confirma la acción.'
      }
    });

    this.knowledgeBase.set('reports', {
      patterns: ['reportes', 'informes', 'estadísticas', 'métricas'],
      responses: {
        'generate': 'Puedes generar reportes desde la página de Reportes usando los filtros disponibles.',
        'schedule': 'Para programar reportes automáticos, ve a Configuración > Reportes Programados.',
        'export': 'Los reportes se pueden exportar en formato PDF, Excel o CSV.'
      }
    });

    this.knowledgeBase.set('software', {
      patterns: ['software', 'licencias', 'aplicaciones', 'programas'],
      responses: {
        'licenses': 'Puedes ver el estado de las licencias en la pestaña Software del inventario.',
        'expiry': 'Las licencias próximas a vencer aparecen en el dashboard principal.',
        'usage': 'El uso de licencias se muestra en tiempo real en la sección de Software.'
      }
    });

    this.knowledgeBase.set('maps', {
      patterns: ['mapas', 'ubicación', 'localización', 'plano'],
      responses: {
        'view': 'Puedes ver los mapas 2D y 3D en la página de Mapas.',
        'equipment': 'Los equipos se pueden ubicar y mover en los mapas interactivos.',
        'areas': 'Puedes crear y gestionar áreas en los mapas para organizar los equipos.'
      }
    });
  }

  // Inicializar patrones de intención
  initializeIntentPatterns() {
    this.intentPatterns.set('greeting', {
      patterns: ['hola', 'hi', 'hello', 'buenos días', 'buenas tardes', 'buenas noches'],
      response: '¡Hola! Soy tu asistente virtual de Nexust. ¿En qué puedo ayudarte hoy?'
    });

    this.intentPatterns.set('help', {
      patterns: ['ayuda', 'help', 'cómo', 'como', 'qué puedo', 'que puedo'],
      response: 'Puedo ayudarte con consultas sobre equipos, mantenimiento, inventario, reportes, software y mapas. ¿Sobre qué tema necesitas información?'
    });

    this.intentPatterns.set('equipment_info', {
      patterns: ['equipo', 'dispositivo', 'computadora', 'servidor', 'impresora'],
      response: 'Te puedo ayudar con información sobre equipos. ¿Quieres saber sobre el estado, ubicación, mantenimiento o algo específico?'
    });

    this.intentPatterns.set('maintenance_info', {
      patterns: ['mantenimiento', 'reparación', 'falla', 'problema'],
      response: 'Puedo ayudarte con temas de mantenimiento. ¿Necesitas programar mantenimiento, reportar una falla o consultar el historial?'
    });

    this.intentPatterns.set('inventory_info', {
      patterns: ['inventario', 'lista', 'buscar', 'encontrar'],
      response: 'Te puedo ayudar con el inventario. ¿Quieres buscar un equipo específico, agregar uno nuevo o ver estadísticas?'
    });

    this.intentPatterns.set('goodbye', {
      patterns: ['adiós', 'bye', 'hasta luego', 'nos vemos', 'chao'],
      response: '¡Hasta luego! Si necesitas ayuda en el futuro, no dudes en preguntarme. ¡Que tengas un buen día!'
    });
  }

  // Procesar mensaje del usuario
  async processMessage(userId, message, context = {}) {
    const conversation = this.getConversation(userId);
    const normalizedMessage = message.toLowerCase().trim();

    // Detectar intención
    const intent = this.detectIntent(normalizedMessage);
    
    // Generar respuesta
    const response = await this.generateResponse(intent, normalizedMessage, context, conversation);

    // Guardar en conversación
    conversation.messages.push({
      type: 'user',
      content: message,
      timestamp: new Date()
    });

    conversation.messages.push({
      type: 'bot',
      content: response.text,
      timestamp: new Date(),
      actions: response.actions || [],
      suggestions: response.suggestions || []
    });

    return response;
  }

  // Detectar intención del mensaje
  detectIntent(message) {
    for (const [intentName, intentData] of this.intentPatterns) {
      for (const pattern of intentData.patterns) {
        if (message.includes(pattern)) {
          return {
            name: intentName,
            confidence: 0.8,
            matchedPattern: pattern
          };
        }
      }
    }

    // Buscar en base de conocimiento
    for (const [category, data] of this.knowledgeBase) {
      for (const pattern of data.patterns) {
        if (message.includes(pattern)) {
          return {
            name: 'knowledge_query',
            category: category,
            confidence: 0.7,
            matchedPattern: pattern
          };
        }
      }
    }

    return {
      name: 'unknown',
      confidence: 0.1
    };
  }

  // Generar respuesta
  async generateResponse(intent, message, context, conversation) {
    switch (intent.name) {
      case 'greeting':
        return this.generateGreetingResponse();
      
      case 'help':
        return this.generateHelpResponse();
      
      case 'equipment_info':
        return await this.generateEquipmentResponse(message, context);
      
      case 'maintenance_info':
        return await this.generateMaintenanceResponse(message, context);
      
      case 'inventory_info':
        return await this.generateInventoryResponse(message, context);
      
      case 'knowledge_query':
        return this.generateKnowledgeResponse(intent.category, message, context);
      
      case 'goodbye':
        return this.generateGoodbyeResponse();
      
      default:
        return this.generateDefaultResponse(message, conversation);
    }
  }

  // Generar respuesta de saludo
  generateGreetingResponse() {
    return {
      text: this.intentPatterns.get('greeting').response,
      suggestions: [
        '¿Cómo puedo buscar un equipo?',
        '¿Cómo programo mantenimiento?',
        '¿Dónde veo los reportes?',
        '¿Cómo uso los mapas?'
      ]
    };
  }

  // Generar respuesta de ayuda
  generateHelpResponse() {
    return {
      text: this.intentPatterns.get('help').response,
      suggestions: [
        'Equipos y dispositivos',
        'Mantenimiento y reparaciones',
        'Inventario y búsqueda',
        'Reportes y estadísticas',
        'Software y licencias',
        'Mapas y ubicaciones'
      ]
    };
  }

  // Generar respuesta sobre equipos
  async generateEquipmentResponse(message, context) {
    const { equipos = [] } = context;
    
    // Buscar equipos mencionados en el mensaje
    const mentionedEquipment = this.findMentionedEquipment(message, equipos);
    
    if (mentionedEquipment.length > 0) {
      const equipment = mentionedEquipment[0];
      return {
        text: `Encontré información sobre ${equipment.marca} ${equipment.modelo}:\n\n` +
              `• Estado: ${equipment.estado}\n` +
              `• Ubicación: ${equipment.ubicacion || 'No especificada'}\n` +
              `• Último mantenimiento: ${this.getLastMaintenance(equipment)}\n` +
              `• Número de serie: ${equipment.numero_serie || 'No disponible'}`,
        actions: [
          {
            type: 'view_equipment',
            label: 'Ver Detalles',
            params: { equipment_id: equipment.id }
          },
          {
            type: 'schedule_maintenance',
            label: 'Programar Mantenimiento',
            params: { equipment_id: equipment.id }
          }
        ],
        suggestions: [
          '¿Cuál es el historial de mantenimiento?',
          '¿Dónde está ubicado?',
          '¿Necesita mantenimiento?'
        ]
      };
    }

    return {
      text: 'Puedo ayudarte con información sobre equipos. ¿Tienes algún equipo específico en mente? Puedes mencionar la marca, modelo o número de serie.',
      suggestions: [
        'Buscar por marca',
        'Buscar por modelo',
        'Ver todos los equipos',
        'Equipos que necesitan mantenimiento'
      ]
    };
  }

  // Generar respuesta sobre mantenimiento
  async generateMaintenanceResponse(message, context) {
    const { equipos = [] } = context;
    
    // Buscar equipos que necesitan mantenimiento
    const equipmentNeedingMaintenance = equipos.filter(e => 
      e.estado === 'Malo' || e.estado === 'Regular'
    );

    if (equipmentNeedingMaintenance.length > 0) {
      return {
        text: `Encontré ${equipmentNeedingMaintenance.length} equipos que pueden necesitar mantenimiento:\n\n` +
              equipmentNeedingMaintenance.slice(0, 3).map(e => 
                `• ${e.marca} ${e.modelo} - Estado: ${e.estado}`
              ).join('\n') +
              (equipmentNeedingMaintenance.length > 3 ? `\n... y ${equipmentNeedingMaintenance.length - 3} más` : ''),
        actions: [
          {
            type: 'view_maintenance_queue',
            label: 'Ver Cola de Mantenimiento',
            params: {}
          },
          {
            type: 'schedule_bulk_maintenance',
            label: 'Programar Mantenimiento Masivo',
            params: { equipment_ids: equipmentNeedingMaintenance.map(e => e.id) }
          }
        ],
        suggestions: [
          '¿Cómo programo mantenimiento?',
          '¿Cuál es el historial de mantenimientos?',
          '¿Hay equipos críticos?'
        ]
      };
    }

    return {
      text: 'No hay equipos que requieran mantenimiento urgente en este momento. ¿Necesitas programar mantenimiento preventivo o consultar el historial?',
      suggestions: [
        'Programar mantenimiento preventivo',
        'Ver historial de mantenimientos',
        'Crear solicitud de mantenimiento',
        'Ver calendario de mantenimientos'
      ]
    };
  }

  // Generar respuesta sobre inventario
  async generateInventoryResponse(message, context) {
    const { equipos = [], software = [], perifericos = [] } = context;
    const totalItems = equipos.length + software.length + perifericos.length;

    return {
      text: `Tu inventario actual tiene:\n\n` +
            `• ${equipos.length} equipos\n` +
            `• ${software.length} software\n` +
            `• ${perifericos.length} periféricos\n\n` +
            `Total: ${totalItems} activos registrados`,
      actions: [
        {
          type: 'view_inventory',
          label: 'Ver Inventario Completo',
          params: {}
        },
        {
          type: 'search_inventory',
          label: 'Buscar en Inventario',
          params: {}
        },
        {
          type: 'add_item',
          label: 'Agregar Nuevo Activo',
          params: {}
        }
      ],
      suggestions: [
        '¿Cómo busco un equipo específico?',
        '¿Cómo agrego un nuevo activo?',
        '¿Dónde veo las estadísticas?',
        '¿Cómo exporto el inventario?'
      ]
    };
  }

  // Generar respuesta de conocimiento
  generateKnowledgeResponse(category, message, context) {
    const knowledge = this.knowledgeBase.get(category);
    if (!knowledge) {
      return this.generateDefaultResponse(message, null);
    }

    // Buscar la respuesta más relevante
    for (const [key, response] of Object.entries(knowledge.responses)) {
      if (message.includes(key)) {
        return {
          text: response,
          suggestions: this.getCategorySuggestions(category)
        };
      }
    }

    // Respuesta genérica de la categoría
    return {
      text: `Te puedo ayudar con temas de ${category}. ¿Qué información específica necesitas?`,
      suggestions: this.getCategorySuggestions(category)
    };
  }

  // Generar respuesta de despedida
  generateGoodbyeResponse() {
    return {
      text: this.intentPatterns.get('goodbye').response
    };
  }

  // Generar respuesta por defecto
  generateDefaultResponse(message, conversation) {
    const suggestions = [
      '¿Cómo puedo buscar equipos?',
      '¿Cómo programo mantenimiento?',
      '¿Dónde veo los reportes?',
      '¿Cómo uso los mapas?',
      '¿Qué es el inventario?'
    ];

    return {
      text: 'No estoy seguro de entender tu pregunta. ¿Podrías reformularla o elegir una de las opciones de abajo?',
      suggestions: suggestions.slice(0, 3)
    };
  }

  // Buscar equipos mencionados en el mensaje
  findMentionedEquipment(message, equipos) {
    const mentioned = [];
    
    for (const equipo of equipos) {
      const searchTerms = [
        equipo.marca,
        equipo.modelo,
        equipo.numero_serie,
        equipo.nombre
      ].filter(term => term && term.toLowerCase());

      for (const term of searchTerms) {
        if (message.includes(term.toLowerCase())) {
          mentioned.push(equipo);
          break;
        }
      }
    }

    return mentioned;
  }

  // Obtener último mantenimiento
  getLastMaintenance(equipo) {
    const mantenimientos = equipo.trazabilidad?.filter(log => 
      log.accion === 'Mantenimiento'
    ) || [];

    if (mantenimientos.length === 0) {
      return 'Nunca';
    }

    const ultimo = mantenimientos.sort((a, b) => 
      new Date(b.fecha) - new Date(a.fecha)
    )[0];

    return new Date(ultimo.fecha).toLocaleDateString();
  }

  // Obtener sugerencias por categoría
  getCategorySuggestions(category) {
    const suggestions = {
      'equipment_status': [
        '¿Cómo cambio el estado de un equipo?',
        '¿Qué significa cada estado?',
        '¿Cómo actualizo la información?'
      ],
      'maintenance': [
        '¿Cómo programo mantenimiento?',
        '¿Qué es mantenimiento preventivo?',
        '¿Cómo reporto una falla?'
      ],
      'inventory': [
        '¿Cómo busco un equipo?',
        '¿Cómo agrego un nuevo activo?',
        '¿Cómo edito información?'
      ],
      'reports': [
        '¿Cómo genero un reporte?',
        '¿Qué tipos de reportes hay?',
        '¿Cómo exporto datos?'
      ],
      'software': [
        '¿Cómo veo las licencias?',
        '¿Qué software está por vencer?',
        '¿Cómo gestiono licencias?'
      ],
      'maps': [
        '¿Cómo uso los mapas?',
        '¿Cómo ubico equipos?',
        '¿Cómo creo áreas?'
      ]
    };

    return suggestions[category] || [];
  }

  // Obtener conversación del usuario
  getConversation(userId) {
    if (!this.conversations.has(userId)) {
      this.conversations.set(userId, {
        userId,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    return this.conversations.get(userId);
  }

  // Obtener historial de conversaciones
  getConversationHistory(userId, limit = 50) {
    const conversation = this.getConversation(userId);
    return conversation.messages.slice(-limit);
  }

  // Limpiar conversación
  clearConversation(userId) {
    this.conversations.delete(userId);
  }

  // Obtener estadísticas del chatbot
  getStats() {
    const totalConversations = this.conversations.size;
    const totalMessages = Array.from(this.conversations.values())
      .reduce((total, conv) => total + conv.messages.length, 0);

    return {
      total_conversations: totalConversations,
      total_messages: totalMessages,
      average_messages_per_conversation: totalConversations > 0 ? 
        totalMessages / totalConversations : 0
    };
  }
}

// Instancia global del chatbot
export const chatbot = new Chatbot();
