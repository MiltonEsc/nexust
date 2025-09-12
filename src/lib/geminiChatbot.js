// Sistema de chatbot con Gemini AI
import { supabase } from '../supabaseClient';

export class GeminiChatbot {
  constructor() {
    this.conversations = new Map();
  }

  // Procesar mensaje con Gemini AI
  async processMessage(userId, message, context = {}) {
    const conversation = this.getConversation(userId);
    
    try {
      // Llamar a la función de Supabase que usa Gemini
      const { data, error } = await supabase.functions.invoke('chatbot-gemini', {
        body: { 
          message: message.trim(),
          context: context
        }
      });

      if (error) throw error;

      const response = {
        text: data.response,
        context: data.context,
        timestamp: new Date(),
        suggestions: this.generateSuggestions(message, data.context)
      };

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
        suggestions: response.suggestions
      });

      return response;

    } catch (error) {
      console.error('Error en Gemini Chatbot:', error);
      
      // Respuesta de fallback
      const fallbackResponse = {
        text: "Lo siento, hubo un error procesando tu consulta. Por favor, intenta de nuevo o contacta al administrador.",
        timestamp: new Date(),
        suggestions: [
          '¿Cómo busco un equipo?',
          '¿Cómo programo mantenimiento?',
          '¿Dónde veo los reportes?'
        ]
      };

      // Guardar en conversación
      conversation.messages.push({
        type: 'user',
        content: message,
        timestamp: new Date()
      });

      conversation.messages.push({
        type: 'bot',
        content: fallbackResponse.text,
        timestamp: new Date(),
        suggestions: fallbackResponse.suggestions
      });

      return fallbackResponse;
    }
  }

  // Generar sugerencias basadas en el contexto
  generateSuggestions(message, context) {
    const suggestions = [];
    const lowerMessage = message.toLowerCase();

    // Sugerencias basadas en el contenido del mensaje
    if (lowerMessage.includes('equipo') || lowerMessage.includes('computadora')) {
      suggestions.push('¿Cómo busco un equipo específico?');
      suggestions.push('¿Qué equipos necesitan mantenimiento?');
    }

    if (lowerMessage.includes('software') || lowerMessage.includes('licencia')) {
      suggestions.push('¿Qué software está por vencer?');
      suggestions.push('¿Cómo gestiono las licencias?');
    }

    if (lowerMessage.includes('mantenimiento') || lowerMessage.includes('reparación')) {
      suggestions.push('¿Cómo programo mantenimiento?');
      suggestions.push('¿Cuál es el historial de mantenimientos?');
    }

    if (lowerMessage.includes('reporte') || lowerMessage.includes('estadística')) {
      suggestions.push('¿Cómo genero un reporte?');
      suggestions.push('¿Qué métricas puedo ver?');
    }

    if (lowerMessage.includes('mapa') || lowerMessage.includes('ubicación')) {
      suggestions.push('¿Cómo uso los mapas?');
      suggestions.push('¿Cómo ubico equipos?');
    }

    // Sugerencias generales si no hay coincidencias específicas
    if (suggestions.length === 0) {
      suggestions.push('¿Cómo busco un equipo?');
      suggestions.push('¿Cómo programo mantenimiento?');
      suggestions.push('¿Dónde veo los reportes?');
      suggestions.push('¿Cómo uso los mapas?');
    }

    return suggestions.slice(0, 4); // Máximo 4 sugerencias
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

// Instancia global del chatbot con Gemini
export const geminiChatbot = new GeminiChatbot();
