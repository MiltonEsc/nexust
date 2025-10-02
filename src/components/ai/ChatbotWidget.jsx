import React, { useState, useEffect, useRef } from 'react';
import { 
  ChatBubbleLeftRightIcon, 
  XMarkIcon, 
  PaperAirplaneIcon,
  SparklesIcon,
  LightBulbIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { geminiChatbot } from '../../lib/geminiChatbot';
import { useInventoryData } from '../../hooks/useInventoryData';

const ChatbotWidget = ({ userId, context = {} }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Obtener datos del inventario
  const inventoryData = useInventoryData();

  // Scroll automático al final
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Actualizar mensaje inicial cuando cambien los datos del inventario
  useEffect(() => {
    if (isOpen && messages.length === 1 && !inventoryData.loading) {
      const totalItems = inventoryData.equipos.length + inventoryData.software.length + 
                        inventoryData.perifericos.length + inventoryData.consumibles.length;
      
      const updatedMessage = `¡Hola! Soy tu asistente virtual de Nexust con IA avanzada (Gemini). 

Tu inventario actual tiene:
• ${inventoryData.equipos.length} equipos
• ${inventoryData.software.length} software  
• ${inventoryData.perifericos.length} periféricos
• ${inventoryData.consumibles.length} consumibles
Total: ${totalItems} activos registrados

Puedo ayudarte con consultas inteligentes sobre tu inventario, recomendaciones, análisis y mucho más. ¿En qué puedo ayudarte hoy?`;

      setMessages([{
        type: 'bot',
        content: updatedMessage,
        timestamp: new Date(),
        suggestions: [
          '¿Qué equipos necesitan mantenimiento?',
          '¿Cómo optimizo mi inventario?',
          '¿Qué software está por vencer?',
          '¿Cómo genero reportes inteligentes?'
        ]
      }]);
    }
  }, [inventoryData, isOpen, messages.length]);

  // Manejar envío de mensaje
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isTyping) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsTyping(true);

    try {
      // Crear contexto con datos del inventario
      const contextWithInventory = {
        ...context,
        equipos: inventoryData.equipos || [],
        software: inventoryData.software || [],
        perifericos: inventoryData.perifericos || [],
        consumibles: inventoryData.consumibles || []
      };

      // Debug: Log del contexto para verificar datos
      // Contexto enviado a Gemini

      const response = await geminiChatbot.processMessage(userId, userMessage, contextWithInventory);
      
      setMessages(prev => [
        ...prev,
        { type: 'user', content: userMessage, timestamp: new Date() },
        { 
          type: 'bot', 
          content: response.text, 
          timestamp: new Date(),
          actions: response.actions || [],
          suggestions: response.suggestions || []
        }
      ]);
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Respuesta de error más específica
      let errorMessage = 'Lo siento, hubo un error procesando tu consulta. ';
      
      if (inventoryData.loading) {
        errorMessage += 'Los datos del inventario se están cargando. Por favor, espera un momento e intenta de nuevo.';
      } else if (inventoryData.error) {
        errorMessage += `Error al cargar datos: ${inventoryData.error}. Por favor, contacta al administrador.`;
      } else {
        errorMessage += 'Por favor, intenta de nuevo o contacta al administrador.';
      }
      
      setMessages(prev => [
        ...prev,
        { type: 'user', content: userMessage, timestamp: new Date() },
        { 
          type: 'bot', 
          content: errorMessage, 
          timestamp: new Date(),
          suggestions: [
            '¿Cómo busco un equipo?',
            '¿Cómo agrego un nuevo activo?',
            '¿Dónde veo el inventario?'
          ]
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // Manejar sugerencias
  const handleSuggestionClick = (suggestion) => {
    setInputMessage(suggestion);
  };

  // Manejar acciones
  const handleActionClick = (action) => {
    // Aquí se pueden implementar las acciones específicas
    // Action clicked
  };

  // Abrir chatbot con mensaje inicial
  const openChatbot = () => {
    setIsOpen(true);
    if (messages.length === 0) {
      // Generar mensaje inicial con datos del inventario
      const totalItems = inventoryData.equipos.length + inventoryData.software.length + 
                        inventoryData.perifericos.length + inventoryData.consumibles.length;
      
      const initialMessage = inventoryData.loading 
        ? '¡Hola! Soy tu asistente virtual de Nexust con IA avanzada. Cargando datos del inventario...'
        : `¡Hola! Soy tu asistente virtual de Nexust con IA avanzada (Gemini). 

Tu inventario actual tiene:
• ${inventoryData.equipos.length} equipos
• ${inventoryData.software.length} software  
• ${inventoryData.perifericos.length} periféricos
• ${inventoryData.consumibles.length} consumibles
Total: ${totalItems} activos registrados

Puedo ayudarte con consultas inteligentes sobre tu inventario, recomendaciones, análisis y mucho más. ¿En qué puedo ayudarte hoy?`;

      setMessages([{
        type: 'bot',
        content: initialMessage,
        timestamp: new Date(),
        suggestions: [
          '¿Qué equipos necesitan mantenimiento?',
          '¿Cómo optimizo mi inventario?',
          '¿Qué software está por vencer?',
          '¿Cómo genero reportes inteligentes?'
        ]
      }]);
    }
  };

  return (
    <>
      {/* Botón flotante */}
      {!isOpen && (
        <button
          onClick={openChatbot}
          className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110 z-50"
          title="Abrir asistente virtual"
        >
          <ChatBubbleLeftRightIcon className="h-6 w-6" />
        </button>
      )}

      {/* Widget del chatbot */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <SparklesIcon className="h-5 w-5" />
              <span className="font-semibold">Asistente IA (Gemini)</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs px-3 py-2 rounded-lg ${
                  message.type === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  <p className="text-sm">{message.content}</p>
                  
                  {/* Acciones */}
                  {message.actions && message.actions.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {message.actions.map((action, actionIndex) => (
                        <button
                          key={actionIndex}
                          onClick={() => handleActionClick(action)}
                          className="block w-full text-left text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded transition-colors"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Sugerencias */}
                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {message.suggestions.map((suggestion, suggestionIndex) => (
                        <button
                          key={suggestionIndex}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="block w-full text-left text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Indicador de escritura */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 px-3 py-2 rounded-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Escribe tu pregunta..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isTyping}
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isTyping}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white p-2 rounded-lg transition-colors"
              >
                <PaperAirplaneIcon className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default ChatbotWidget;
