# 🤖 Integración de Gemini AI en el Asistente Virtual

## 🎯 **Objetivo**

Integrar Google Gemini AI en el asistente virtual para proporcionar respuestas más inteligentes y contextuales sobre el inventario TIC.

## 🔧 **Implementación Realizada**

### 1. **Función de Supabase con Gemini**
**Archivo:** `supabase/functions/chatbot-gemini/index.ts`

```typescript
// Función que recibe mensajes y contexto del inventario
// Envía prompt estructurado a Gemini API
// Retorna respuesta procesada por IA
```

**Características:**
- ✅ **Contexto del inventario**: Envía datos reales de equipos, software, periféricos
- ✅ **Prompt estructurado**: Instrucciones específicas para el asistente
- ✅ **Manejo de errores**: Respuestas de fallback si falla la API
- ✅ **Configuración optimizada**: Temperature, topK, topP para respuestas balanceadas

### 2. **Servicio de Chatbot con Gemini**
**Archivo:** `src/lib/geminiChatbot.js`

```javascript
export class GeminiChatbot {
  // Procesa mensajes usando la función de Supabase
  async processMessage(userId, message, context)
  
  // Genera sugerencias inteligentes basadas en el contexto
  generateSuggestions(message, context)
  
  // Maneja conversaciones y historial
  getConversation(userId)
}
```

**Características:**
- ✅ **Integración con Supabase**: Usa funciones edge para llamar a Gemini
- ✅ **Contexto dinámico**: Pasa datos del inventario en tiempo real
- ✅ **Sugerencias inteligentes**: Genera sugerencias basadas en el mensaje
- ✅ **Manejo de errores**: Respuestas de fallback si falla la conexión

### 3. **Widget Actualizado**
**Archivo:** `src/components/ai/ChatbotWidget.jsx`

```javascript
// Usa geminiChatbot en lugar del chatbot básico
import { geminiChatbot } from '../../lib/geminiChatbot';

// Mensaje inicial mejorado
const initialMessage = `¡Hola! Soy tu asistente virtual de Nexust con IA avanzada (Gemini).`;
```

**Mejoras:**
- ✅ **Header actualizado**: Muestra "Asistente IA (Gemini)"
- ✅ **Mensaje inicial mejorado**: Explica las capacidades de IA
- ✅ **Sugerencias inteligentes**: Preguntas más específicas y útiles
- ✅ **Diseño mejorado**: Gradiente azul-púrpura para destacar IA

## 🚀 **Funcionalidades de Gemini**

### ✅ **Análisis Inteligente del Inventario**
- **Recomendaciones**: Sugiere optimizaciones basadas en los datos
- **Detección de patrones**: Identifica equipos que necesitan atención
- **Análisis predictivo**: Predice necesidades futuras

### ✅ **Consultas Contextuales**
- **Búsqueda inteligente**: Encuentra equipos por descripción natural
- **Análisis de estado**: Evalúa el estado general del inventario
- **Recomendaciones específicas**: Sugiere acciones concretas

### ✅ **Respuestas Naturales**
- **Conversación fluida**: Respuestas en español natural
- **Tono profesional**: Mantiene formalidad empresarial
- **Contexto relevante**: Usa datos reales del inventario

## 📊 **Estructura de Datos Enviada a Gemini**

```javascript
const inventoryContext = `
Contexto del inventario de la empresa:
- Equipos: ${context.equipos?.length || 0} registrados
- Software: ${context.software?.length || 0} registrados  
- Periféricos: ${context.perifericos?.length || 0} registrados
- Consumibles: ${context.consumibles?.length || 0} registrados

Detalles de equipos:
${context.equipos?.slice(0, 10).map(e => 
  `- ${e.marca} ${e.modelo} (${e.estado}) - S/N: ${e.numero_serie}`
).join('\n') || 'No hay equipos registrados'}

Detalles de software:
${context.software?.slice(0, 10).map(s => 
  `- ${s.nombre} v${s.version} (${s.stock} licencias)`
).join('\n') || 'No hay software registrado'}
`;
```

## 🔧 **Configuración de Gemini**

### **Parámetros Optimizados**
```javascript
generationConfig: {
  temperature: 0.7,        // Creatividad balanceada
  topK: 40,               // Diversidad de respuestas
  topP: 0.95,             // Calidad de respuestas
  maxOutputTokens: 1024,  // Longitud máxima
}
```

### **Prompt Estructurado**
```
Eres un asistente virtual experto en gestión de inventario TIC para la empresa Nexust. 
Responde de manera útil, profesional y amigable en español.

[CONTEXTO DEL INVENTARIO]

Instrucciones:
1. Responde en español de manera natural y conversacional
2. Usa la información del inventario para dar respuestas precisas
3. Si el usuario pregunta sobre equipos específicos, busca en los datos proporcionados
4. Ofrece sugerencias prácticas y acciones concretas
5. Si no tienes información suficiente, sugiere dónde encontrarla
6. Mantén un tono profesional pero amigable
7. Responde de manera concisa pero completa
```

## 🎯 **Ejemplos de Uso**

### **Consultas de Análisis**
- "¿Qué equipos necesitan mantenimiento urgente?"
- "¿Cómo puedo optimizar mi inventario de software?"
- "¿Qué patrones ves en mis equipos más problemáticos?"

### **Consultas Específicas**
- "Busca equipos HP que estén en mal estado"
- "¿Qué software está próximo a vencer?"
- "Recomiéndame equipos para un desarrollador"

### **Consultas de Optimización**
- "¿Cómo puedo reducir costos de mantenimiento?"
- "¿Qué equipos debería reemplazar este año?"
- "¿Cómo organizo mejor mi inventario?"

## 🔒 **Seguridad y Privacidad**

- ✅ **Datos limitados**: Solo se envían los primeros 10 items de cada categoría
- ✅ **Sin información sensible**: No se envían datos personales o financieros
- ✅ **API key segura**: Configurada como variable de entorno en Supabase
- ✅ **Manejo de errores**: No expone información sensible en errores

## 🚀 **Próximos Pasos**

1. **Desplegar función**: Ejecutar `supabase functions deploy chatbot-gemini`
2. **Configurar API key**: Agregar `GOOGLE_GEMINI_API_KEY` en Supabase
3. **Probar funcionalidad**: Hacer consultas al asistente
4. **Monitorear uso**: Revisar logs y métricas de la función

## 📈 **Beneficios de la Integración**

- 🧠 **Inteligencia avanzada**: Respuestas más precisas y útiles
- 📊 **Análisis contextual**: Usa datos reales del inventario
- 💬 **Conversación natural**: Interfaz más amigable y profesional
- 🔍 **Búsqueda inteligente**: Encuentra información de manera más eficiente
- 📋 **Recomendaciones**: Sugiere acciones concretas y útiles

El asistente virtual ahora cuenta con la potencia de Google Gemini AI para proporcionar respuestas más inteligentes y contextuales sobre el inventario TIC.
