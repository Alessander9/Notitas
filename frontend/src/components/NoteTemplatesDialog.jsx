import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  Button,
  Card,
  CardActionArea,
  Chip,
  TextField,
  InputAdornment,
  Tooltip,
  MenuItem,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Close as CloseIcon,
  AutoAwesome as SparklesIcon,
  Groups as MeetingIcon,
  RocketLaunch as SprintIcon,
  Lightbulb as IdeaIcon,
  TrackChanges as GoalsIcon,
  MenuBook as BookIcon,
  Today as DailyIcon,
  ShoppingCart as CartIcon,
  Checklist as TodoIcon,
  Restaurant as RecipeIcon,
  FlightTakeoff as TravelIcon,
  AccountBalanceWallet as BudgetIcon,
  FitnessCenter as WorkoutIcon,
  SelfImprovement as JournalIcon,
  AlarmOn as HabitIcon,
  Contacts as ContactIcon,
  Check as CheckIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  DeleteOutline as DeleteIcon,
  Medication as HealthIcon,
  Mic as PodcastIcon,
  RestaurantMenu as MealPlanIcon,
  BusinessCenter as BusinessIcon,
  Psychology as MindIcon,
  BugReport as BugIcon,
  School as StudyIcon,
  CardGiftcard as WishlistIcon,
  BookmarkBorder as CustomIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { toast } from '../store/toastStore';
import { useConfirmStore } from '../store/confirmStore';
import AiTemplateGeneratorModal from './AiTemplateGeneratorModal';

const NOTE_TEMPLATES = [
  {
    id: 'groceries',
    icon: '🛒',
    badgeIcon: <CartIcon sx={{ fontSize: 18 }} />,
    title: 'Lista de Compras / Supermercado',
    category: 'Vida Diaria',
    description: 'Organiza tus compras por pasillo o sección para no olvidar nada.',
    color: '#e67e22',
    content: `
      <h2>🛒 Lista de Compras y Supermercado</h2>
      <p><strong>Fecha de compra:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
      <hr />
      <h3>🥦 Frutas y Verduras</h3>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Plátanos / Manzanas</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Aguacates y Tomates</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Espinacas / Lechuga</p></div></li>
      </ul>
      <h3>🥩 Carnes, Pescados y Proteínas</h3>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Pechuga de pollo</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Huevos</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Salmón / Atún</p></div></li>
      </ul>
      <h3>🥛 Lácteos y Refrigerados</h3>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Leche vegetal / entera</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Yogur griego</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Queso fresco</p></div></li>
      </ul>
      <h3>🥖 Despensa y Abarrotes</h3>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Arroz integral / Pasta</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Aceite de oliva</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Café en grano / molido</p></div></li>
      </ul>
      <h3>🧼 Hogar y Limpieza</h3>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Detergente para platos</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Papel toalla</p></div></li>
      </ul>
    `,
  },
  {
    id: 'todo-daily',
    icon: '📋',
    badgeIcon: <TodoIcon sx={{ fontSize: 18 }} />,
    title: 'Lista de Pendientes (To-Do Diaria)',
    category: 'Productividad',
    description: 'Estructura tus tareas por nivel de impacto y urgencia.',
    color: '#27ae60',
    content: `
      <h2>📋 Lista de Pendientes y Enfoque Diario</h2>
      <p><strong>Día:</strong> ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <hr />
      <h3>🔥 Prioridad Alta (Must Do - Máximo 3)</h3>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Terminar el entregable principal</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Enviar informe de avance</p></div></li>
      </ul>
      <h3>⚡ Tareas Secundarias (Importantes)</h3>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Responder correos prioritarios</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Revisar tablero de tareas del equipo</p></div></li>
      </ul>
      <h3>🏠 Tareas Personales y Rápidas (&lt; 10 min)</h3>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Realizar pago de servicio</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Hacer 20 min de ejercicio o caminata</p></div></li>
      </ul>
      <h3>💡 Notas del Día y Recordatorios</h3>
      <p>Anotar cualquier idea o pendiente que surja durante la jornada...</p>
    `,
  },
  {
    id: 'health-meds',
    icon: '💊',
    badgeIcon: <HealthIcon sx={{ fontSize: 18 }} />,
    title: 'Control de Medicamentos y Salud',
    category: 'Salud',
    description: 'Seguimiento de dosis, horarios, recetas y registro de síntomas.',
    color: '#e74c3c',
    content: `
      <h2>💊 Control de Medicamentos y Salud</h2>
      <p><strong>Paciente:</strong> Nombre | <strong>Médico tratante:</strong> Dr. ...</p>
      <hr />
      <h3>⏰ Horario de Tomas Diarias</h3>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p><strong>Mañana (Desayuno):</strong> Medicamento A - 500mg con agua</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p><strong>Tarde (Almuerzo):</strong> Vitamina D + Omega 3</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p><strong>Noche (Cena):</strong> Medicamento B - 1 comprimido</p></div></li>
      </ul>
      <h3>🩺 Registro de Parámetros y Síntomas</h3>
      <p>Presión arterial: ___/___ | Glucosa: ___ | Temperatura: ___ °C</p>
      <h3>📅 Próximas Citas y Estudios</h3>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Análisis de sangre en laboratorio (Fecha: __/__)</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Control médico general (Fecha: __/__)</p></div></li>
      </ul>
    `,
  },
  {
    id: 'meal-planner',
    icon: '🍽️',
    badgeIcon: <MealPlanIcon sx={{ fontSize: 18 }} />,
    title: 'Planificador de Menú Semanal',
    category: 'Vida Diaria',
    description: 'Organiza desayunos, almuerzos y cenas de lunes a domingo.',
    color: '#2ecc71',
    content: `
      <h2>🍽️ Planificador de Menú Semanal (Meal Planner)</h2>
      <p><strong>Semana:</strong> Del __ al __</p>
      <hr />
      <h3>🥗 Lunes a Miércoles</h3>
      <p><strong>Lunes:</strong> Desayuno: Huevos con tostadas | Almuerzo: Ensalada César con pollo | Cena: Crema de calabaza</p>
      <p><strong>Martes:</strong> Desayuno: Yogur con avena y frutas | Almuerzo: Salmón con quinoa | Cena: Tortilla de espinacas</p>
      <p><strong>Miércoles:</strong> Desayuno: Tostada con aguacate | Almuerzo: Lentejas estofadas | Cena: Pechuga a la plancha</p>
      <h3>🍲 Jueves a Domingo</h3>
      <p><strong>Jueves:</strong> Desayuno: Batido verde | Almuerzo: Pasta integral con atún | Cena: Sopa de verduras</p>
      <p><strong>Viernes:</strong> Desayuno: Pancakes de avena | Almuerzo: Bowl de arroz y ternera | Cena: Pizza casera saludable</p>
      <p><strong>Fin de Semana:</strong> Comidas libres / Salida con amigos o familia.</p>
    `,
  },
  {
    id: 'creator-script',
    icon: '🎙️',
    badgeIcon: <PodcastIcon sx={{ fontSize: 18 }} />,
    title: 'Guión de Video / Podcast',
    category: 'Creatividad',
    description: 'Estructura de gancho, desarrollo por bloques, CTA y checklist de grabación.',
    color: '#9b59b6',
    content: `
      <h2>🎙️ Guión de Contenido (Video / Podcast)</h2>
      <p><strong>Título del episodio:</strong> ...</p>
      <p><strong>Objetivo del video:</strong> Enseñar cómo ...</p>
      <hr />
      <h3>🎣 1. El Gancho (Primeros 5-10 segundos)</h3>
      <blockquote>"Si estás cansado de perder tiempo organizando tus notas, este truco te cambiará la vida..."</blockquote>
      <h3>💡 2. Puntos Clave / Desarrollo</h3>
      <p><strong>Punto 1:</strong> Introducir el problema y la frustración común.</p>
      <p><strong>Punto 2:</strong> Demostración práctica del paso a paso.</p>
      <p><strong>Punto 3:</strong> Errores frecuentes a evitar.</p>
      <h3>🚀 3. Llamada a la Acción (CTA)</h3>
      <p>"Déjame en los comentarios cuál es tu plantilla favorita y no olvides suscribirte."</p>
      <h3>🎬 Checklist de Grabación y Edición</h3>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Ajustar iluminación y nivel de audio</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Grabar tomas B-Roll de apoyo</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Exportar y generar subtítulos</p></div></li>
      </ul>
    `,
  },
  {
    id: 'one-pager',
    icon: '🏢',
    badgeIcon: <BusinessIcon sx={{ fontSize: 18 }} />,
    title: 'Plan de Negocio One-Pager',
    category: 'Trabajo',
    description: 'Propuesta de valor, mercado objetivo, modelo de monetización y métricas.',
    color: '#34495e',
    content: `
      <h2>🏢 Plan de Negocio Ejecutivo (One-Pager)</h2>
      <p><strong>Nombre del Proyecto / Startup:</strong> ...</p>
      <hr />
      <h3>🎯 1. Problema y Oportunidad</h3>
      <p>¿Qué dolor real del mercado estamos resolviendo?</p>
      <h3>💡 2. Propuesta de Valor Única</h3>
      <p>¿Por qué nuestra solución es 10x mejor o más conveniente que las alternativas?</p>
      <h3>👥 3. Cliente Ideal (Buyer Persona)</h3>
      <p>Profesionales independientes, pequeñas agencias y equipos ágiles de 5 a 20 personas.</p>
      <h3>💰 4. Modelo de Ingresos y Precios</h3>
      <p>Suscripción mensual SaaS Freemium / Pago anual con 20% de descuento.</p>
      <h3>📈 5. Métricas Clave (KPIs)</h3>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>MRR (Ingreso Recurrente Mensual): Meta $5,000</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>CAC (Costo de Adquisición) &lt; $30</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Tasa de retención &gt; 85%</p></div></li>
      </ul>
    `,
  },
  {
    id: 'mindful-checkin',
    icon: '🧘',
    badgeIcon: <MindIcon sx={{ fontSize: 18 }} />,
    title: 'Check-in Emocional y Bienestar',
    category: 'Bienestar',
    description: 'Espacio de descarga mental, registro de energía y afirmaciones.',
    color: '#16a085',
    content: `
      <h2>🧘 Check-in Emocional y Descarga Mental</h2>
      <p><strong>Fecha y hora:</strong> ${new Date().toLocaleString('es-ES')}</p>
      <hr />
      <h3>🔋 Nivel de Energía Actual (1 al 10): ___/10</h3>
      <h3>💭 ¿Qué pensamientos ocupan mi mente ahora mismo?</h3>
      <p>Escribe libremente todo lo que sientas sin juzgarte...</p>
      <h3>🛑 ¿Qué cosas están fuera de mi control y debo soltar?</h3>
      <p>1. ...<br />2. ...</p>
      <h3>🌱 ¿Qué pequeña acción puedo hacer hoy para sentirme en paz?</h3>
      <p>Dar un paseo de 15 minutos, desconectarme a las 7 PM, leer un capítulo de mi libro favorito.</p>
    `,
  },
  {
    id: 'bug-report',
    icon: '💻',
    badgeIcon: <BugIcon sx={{ fontSize: 18 }} />,
    title: 'Reporte de Bug / Incidencia Técnica',
    category: 'Trabajo',
    description: 'Comportamiento observado, esperado, pasos de reproducción y logs.',
    color: '#c0392b',
    content: `
      <h2>💻 Reporte de Incidencia / Bug</h2>
      <p><strong>Módulo afectado:</strong> ... | <strong>Severidad:</strong> [Alta / Media / Baja]</p>
      <hr />
      <h3>🔍 Pasos para Reproducir el Error</h3>
      <p>1. Ingresar a la sección ...<br />2. Hacer clic en el botón ...<br />3. Ocurre el siguiente fallo ...</p>
      <h3>❌ Comportamiento Observado</h3>
      <p>La pantalla se queda en blanco o muestra el código de error ...</p>
      <h3>✅ Comportamiento Esperado</h3>
      <p>El sistema debería guardar los cambios y mostrar la confirmación correspondiente.</p>
      <h3>🖥️ Entorno y Dispositivo</h3>
      <p>Navegador: Chrome v122 | OS: Windows 11 | Resolución: 1920x1080</p>
    `,
  },
  {
    id: 'study-plan',
    icon: '🎓',
    badgeIcon: <StudyIcon sx={{ fontSize: 18 }} />,
    title: 'Plan de Estudio y Exámenes',
    category: 'Estudio',
    description: 'Cronograma de repaso, temas clave y simulacros de evaluación.',
    color: '#2980b9',
    content: `
      <h2>🎓 Plan de Estudio y Preparación de Examen</h2>
      <p><strong>Materia / Curso:</strong> ... | <strong>Fecha del Examen:</strong> __/__/____</p>
      <hr />
      <h3>📚 Temario y Módulos de Estudio</h3>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Módulo 1: Fundamentos y conceptos básicos</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Módulo 2: Casos prácticos y ejercicios</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Módulo 3: Fórmulas y definiciones clave</p></div></li>
      </ul>
      <h3>🗓️ Calendario de Repaso Espaciado</h3>
      <p><strong>Día 1:</strong> Lectura y creación de fichas de resumen.<br /><strong>Día 3:</strong> Resolución de 10 ejercicios de práctica.<br /><strong>Día 5:</strong> Simulacro con cronómetro.</p>
    `,
  },
  {
    id: 'wishlist-saver',
    icon: '🎁',
    badgeIcon: <WishlistIcon sx={{ fontSize: 18 }} />,
    title: 'Lista de Deseos y Control de Gastos',
    category: 'Finanzas',
    description: 'Filtro anti-compras impulsivas con regla de espera de 30 días.',
    color: '#8e44ad',
    content: `
      <h2>🎁 Lista de Deseos (Wishlist y Control de Compras)</h2>
      <p><strong>Regla de oro:</strong> Si cuesta más de $50, esperar 30 días antes de comprarlo.</p>
      <hr />
      <h3>🛍️ Artículos en Espera (Regla 30 Días)</h3>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p><strong>Auriculares Noise-Cancelling:</strong> Precio aprox $120 | Fecha inicio: __/__</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p><strong>Silla ergonómica:</strong> Precio aprox $180 | Fecha inicio: __/__</p></div></li>
      </ul>
      <h3>⚖️ Preguntas de Evaluación</h3>
      <p>1. ¿Lo necesito realmente o es un deseo pasajero?<br />2. ¿Tengo el dinero disponible sin afectar mi fondo de emergencia?<br />3. ¿Tengo un artículo similar en casa que aún cumple la función?</p>
    `,
  },
  {
    id: 'habits',
    icon: '✨',
    badgeIcon: <HabitIcon sx={{ fontSize: 18 }} />,
    title: 'Seguimiento de Hábitos (Habit Tracker)',
    category: 'Bienestar',
    description: 'Control semanal de consistencia para tus hábitos clave.',
    color: '#8e44ad',
    content: `
      <h2>✨ Seguimiento Semanal de Hábitos</h2>
      <p><strong>Semana:</strong> Del __ al __</p>
      <hr />
      <h3>💧 1. Hidratación (2L de agua diarios)</h3>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Lun &nbsp;|&nbsp; Mar &nbsp;|&nbsp; Mié &nbsp;|&nbsp; Jue &nbsp;|&nbsp; Vie &nbsp;|&nbsp; Sáb &nbsp;|&nbsp; Dom</p></div></li>
      </ul>
      <h3>🏃‍♂️ 2. Actividad Física (30 min)</h3>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Lun &nbsp;|&nbsp; Mar &nbsp;|&nbsp; Mié &nbsp;|&nbsp; Jue &nbsp;|&nbsp; Vie &nbsp;|&nbsp; Sáb &nbsp;|&nbsp; Dom</p></div></li>
      </ul>
      <h3>📚 3. Lectura / Estudio (20 páginas)</h3>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Lun &nbsp;|&nbsp; Mar &nbsp;|&nbsp; Mié &nbsp;|&nbsp; Jue &nbsp;|&nbsp; Vie &nbsp;|&nbsp; Sáb &nbsp;|&nbsp; Dom</p></div></li>
      </ul>
    `,
  },
  {
    id: 'budget',
    icon: '💰',
    badgeIcon: <BudgetIcon sx={{ fontSize: 18 }} />,
    title: 'Presupuesto y Finanzas del Mes',
    category: 'Finanzas',
    description: 'Control de ingresos, gastos fijos, variables y metas de ahorro.',
    color: '#2980b9',
    content: `
      <h2>💰 Presupuesto y Finanzas Personales</h2>
      <p><strong>Mes:</strong> ${new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</p>
      <hr />
      <h3>💵 1. Ingresos Previstos</h3>
      <p>Sueldo / Nómina: $____ | Ingresos extra / Freelance: $____</p>
      <h3>🏠 2. Gastos Fijos Obligatorios</h3>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Alquiler / Hipoteca</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Servicios (Luz, Agua, Internet, Móvil)</p></div></li>
      </ul>
      <h3>🎯 3. Metas de Ahorro e Inversión</h3>
      <p>Fondo de emergencia: $____ | Inversiones: $____</p>
    `,
  },
  {
    id: 'travel',
    icon: '✈️',
    badgeIcon: <TravelIcon sx={{ fontSize: 18 }} />,
    title: 'Planificador de Viajes y Equipaje',
    category: 'Vida Diaria',
    description: 'Itinerario, reservas de vuelos, hoteles y packing list de equipaje.',
    color: '#3498db',
    content: `
      <h2>✈️ Planificador de Viaje: Destino</h2>
      <p><strong>Fechas del viaje:</strong> Del __ al __</p>
      <hr />
      <h3>🏨 Reservas y Transporte</h3>
      <p>Vuelo de ida: ... | Hotel: ...</p>
      <h3>🧳 Packing List (Equipaje)</h3>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Pasaporte / Documentos / Seguro</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Cargadores y adaptador universal</p></div></li>
      </ul>
    `,
  },
  {
    id: 'recipe',
    icon: '🍳',
    badgeIcon: <RecipeIcon sx={{ fontSize: 18 }} />,
    title: 'Receta de Cocina',
    category: 'Vida Diaria',
    description: 'Ingredientes, tiempos, porciones y elaboración paso a paso.',
    color: '#d35400',
    content: `
      <h2>🍳 Receta: [Nombre del Platillo]</h2>
      <p><strong>Porciones:</strong> 4 personas | <strong>Tiempo de preparación:</strong> 35 min</p>
      <hr />
      <h3>🛒 Ingredientes</h3>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>500g de pechuga o ingrediente base</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>2 cucharadas de aceite de oliva</p></div></li>
      </ul>
      <h3>👩‍🍳 Elaboración Paso a Paso</h3>
      <p>1. Lavar y cortar los ingredientes en trozos uniformes.<br />2. Saltear a fuego medio durante 10 minutos.<br />3. Servir caliente y disfrutar.</p>
    `,
  },
  {
    id: 'workout',
    icon: '💪',
    badgeIcon: <WorkoutIcon sx={{ fontSize: 18 }} />,
    title: 'Rutina de Entrenamiento / Gym',
    category: 'Salud',
    description: 'Tabla de series, repeticiones, cargas y sensaciones del día.',
    color: '#c0392b',
    content: `
      <h2>💪 Registro de Entrenamiento</h2>
      <p><strong>Grupo muscular:</strong> Pecho & Tríceps | <strong>Fecha:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
      <hr />
      <h3>🏋️‍♂️ Ejercicios Principales</h3>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p><strong>Press de banca plano:</strong> 4 series x 8-10 reps (Carga: ___ kg)</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p><strong>Press inclinado con mancuernas:</strong> 3 series x 12 reps</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p><strong>Fondos en paralelas:</strong> 3 series al fallo</p></div></li>
      </ul>
    `,
  },
  {
    id: 'gratitude',
    icon: '🌱',
    badgeIcon: <JournalIcon sx={{ fontSize: 18 }} />,
    title: 'Diario de Gratitud y Reflexión',
    category: 'Bienestar',
    description: '3 motivos de gratitud diaria y reflexión nocturna.',
    color: '#16a085',
    content: `
      <h2>🌱 Diario de Gratitud y Reflexión</h2>
      <p><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
      <hr />
      <h3>☀️ Reflexión Matutina: 3 Motivos de Gratitud</h3>
      <p>1. Hoy me siento agradecido/a por...<br />2. Agradezco la oportunidad de...<br />3. Valoro tener a mi lado a...</p>
      <h3>🌙 Cierre Nocturno</h3>
      <p><strong>¿Qué fue lo mejor que me pasó hoy?:</strong> ...</p>
    `,
  },
  {
    id: 'meeting',
    icon: '📝',
    badgeIcon: <MeetingIcon sx={{ fontSize: 18 }} />,
    title: 'Minuta de Reunión',
    category: 'Trabajo',
    description: 'Estructura para registrar acuerdos, asistentes y próximos pasos.',
    color: '#386c5f',
    content: `
      <h2>📝 Minuta de Reunión</h2>
      <p><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-ES')} | <strong>Hora:</strong> 10:00 AM</p>
      <p><strong>Asistentes:</strong> Juan Pérez, María Gómez, Carlos Ruiz</p>
      <hr />
      <h3>🎯 Objetivo</h3>
      <p>Alinear los entregables del próximo sprint y revisar bloqueos.</p>
      <h3>📌 Acuerdos y Decisiones</h3>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Actualizar la documentación de la API</p></div></li>
      </ul>
    `,
  },
  {
    id: 'sprint',
    icon: '🚀',
    badgeIcon: <SprintIcon sx={{ fontSize: 18 }} />,
    title: 'Plan de Sprint / Proyecto',
    category: 'Trabajo',
    description: 'Organiza objetivos, entregables y fechas límite para tu equipo.',
    color: '#e74c3c',
    content: `
      <h2>🚀 Plan de Sprint #</h2>
      <p><strong>Duración:</strong> 2 semanas</p>
      <hr />
      <h3>🎯 Meta Principal del Sprint</h3>
      <p>Lanzar la funcionalidad X en entorno de producción.</p>
    `,
  },
  {
    id: 'brainstorm',
    icon: '💡',
    badgeIcon: <IdeaIcon sx={{ fontSize: 18 }} />,
    title: 'Lluvia de Ideas (Brainstorming)',
    category: 'Creatividad',
    description: 'Espacio libre para plasmar conceptos, pros y contras.',
    color: '#f39c12',
    content: `
      <h2>💡 Sesión de Lluvia de Ideas</h2>
      <p><strong>Tema / Desafío:</strong> ¿Cómo mejorar la retención de usuarios?</p>
      <hr />
      <h3>🌟 Ideas Propuestas</h3>
      <p>1. Gamificación con insignias.<br />2. Onboarding guiado interactivo.<br />3. Asistente con IA incorporado.</p>
    `,
  },
  {
    id: 'weekly',
    icon: '🎯',
    badgeIcon: <GoalsIcon sx={{ fontSize: 18 }} />,
    title: 'Metas y Enfoque Semanal',
    category: 'Productividad',
    description: 'Define tus 3 prioridades semanales y desglose por día.',
    color: '#8e44ad',
    content: `
      <h2>🎯 Enfoque Semanal</h2>
      <p><strong>Semana del:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
      <hr />
      <h3>🔥 Top 3 Prioridades</h3>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Cerrar propuesta comercial con cliente A</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Publicar artículo del blog</p></div></li>
      </ul>
    `,
  },
  {
    id: 'reading',
    icon: '📚',
    badgeIcon: <BookIcon sx={{ fontSize: 18 }} />,
    title: 'Ficha de Lectura / Apuntes',
    category: 'Estudio',
    description: 'Resume libros, artículos o cursos con citas y aprendizajes.',
    color: '#2980b9',
    content: `
      <h2>📚 Ficha de Lectura: [Título del Libro]</h2>
      <p><strong>Autor:</strong> ... | <strong>Calificación:</strong> ⭐⭐⭐⭐⭐</p>
      <hr />
      <h3>💡 Tesis Principal</h3>
      <p>Resumen en 2 o 3 oraciones de la idea central del autor.</p>
    `,
  },
  {
    id: 'standup',
    icon: '⚡',
    badgeIcon: <DailyIcon sx={{ fontSize: 18 }} />,
    title: 'Daily Standup',
    category: 'Trabajo',
    description: 'Formato ágil: qué hice ayer, qué haré hoy y bloqueos.',
    color: '#16a085',
    content: `
      <h2>⚡ Daily Standup</h2>
      <p><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
      <hr />
      <h3>✅ ¿Qué logré ayer?</h3>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Desplegar corrección en staging</p></div></li>
      </ul>
      <h3>🎯 ¿Qué haré hoy?</h3>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Crear tests de integración</p></div></li>
      </ul>
      <h3>🛑 ¿Tengo algún bloqueo?</h3>
      <p>Ninguno por el momento.</p>
    `,
  },
  {
    id: 'contact',
    icon: '👤',
    badgeIcon: <ContactIcon sx={{ fontSize: 18 }} />,
    title: 'Ficha de Contacto y Networking',
    category: 'Trabajo',
    description: 'Registra datos clave de personas para hacer seguimiento profesional.',
    color: '#2c3e50',
    content: `
      <h2>👤 Ficha de Contacto: [Nombre de la Persona]</h2>
      <p><strong>Empresa / Rol:</strong> ...</p>
      <p><strong>Email:</strong> ... | <strong>Teléfono / WhatsApp:</strong> ...</p>
      <hr />
      <h3>🤝 Contexto de Cómo nos Conocimos</h3>
      <p>Evento, conferencia o recomendación de...</p>
    `,
  },
];

const TEMPLATE_CATEGORIES = [
  'Todas',
  '⭐ Mis Plantillas',
  'Vida Diaria',
  'Productividad',
  'Salud',
  'Bienestar',
  'Finanzas',
  'Trabajo',
  'Estudio',
  'Creatividad',
];

export default function NoteTemplatesDialog({ open, onClose, onSelectTemplate }) {
  const queryClient = useQueryClient();
  const { openConfirm } = useConfirmStore();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [selectedId, setSelectedId] = useState('groceries');
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [aiGeneratorOpen, setAiGeneratorOpen] = useState(false);

  // Estados para el editor modal de plantilla personalizada
  const [customEditorOpen, setCustomEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIcon, setFormIcon] = useState('📝');
  const [formCategory, setFormCategory] = useState('Personalizadas');
  const [formContent, setFormContent] = useState('');

  // Fetch de plantillas personalizadas del usuario desde backend
  const { data: customTemplates = [] } = useQuery({
    queryKey: ['custom-templates'],
    queryFn: async () => {
      const res = await api.get('/templates');
      return res.data;
    },
    enabled: open,
  });

  // Mutaciones para crear, editar y borrar plantillas personalizadas
  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/templates', payload);
      return res.data;
    },
    onSuccess: (newTmpl) => {
      queryClient.invalidateQueries({ queryKey: ['custom-templates'] });
      toast.success('Plantilla personalizada creada con éxito');
      setCustomEditorOpen(false);
      setSelectedId(newTmpl.id);
      setActiveCategory('⭐ Mis Plantillas');
    },
    onError: () => toast.error('Error al guardar la plantilla'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const res = await api.put(`/templates/${id}`, payload);
      return res.data;
    },
    onSuccess: (updatedTmpl) => {
      queryClient.invalidateQueries({ queryKey: ['custom-templates'] });
      toast.success('Plantilla actualizada con éxito');
      setCustomEditorOpen(false);
      setSelectedId(updatedTmpl.id);
    },
    onError: () => toast.error('Error al actualizar la plantilla'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/templates/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-templates'] });
      toast.success('Plantilla eliminada');
      setSelectedId('groceries');
    },
    onError: () => toast.error('Error al eliminar la plantilla'),
  });

  // Unificación de plantillas del sistema y personalizadas
  const allTemplates = useMemo(() => {
    const formattedCustom = customTemplates.map((t) => ({
      ...t,
      isCustom: true,
      badgeIcon: <CustomIcon sx={{ fontSize: 18 }} />,
      color: '#386c5f',
    }));
    return [...formattedCustom, ...NOTE_TEMPLATES];
  }, [customTemplates]);

  const filteredTemplates = useMemo(() => {
    return allTemplates.filter((tmpl) => {
      let matchesCategory = true;
      if (activeCategory === '⭐ Mis Plantillas') {
        matchesCategory = Boolean(tmpl.isCustom);
      } else if (activeCategory !== 'Todas') {
        matchesCategory = tmpl.category === activeCategory;
      }

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        tmpl.title.toLowerCase().includes(q) ||
        (tmpl.description && tmpl.description.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [allTemplates, activeCategory, searchQuery]);

  const selectedTemplate = useMemo(() => {
    return (
      allTemplates.find((t) => t.id === selectedId) ||
      filteredTemplates[0] ||
      allTemplates[0]
    );
  }, [selectedId, filteredTemplates, allTemplates]);

  const handleApply = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate);
      onClose();
    }
  };

  const handleOpenCreateNew = () => {
    setEditingTemplate(null);
    setFormTitle('');
    setFormDescription('');
    setFormIcon('📝');
    setFormCategory('Personalizadas');
    setFormContent(`<h2>📝 Mi Nueva Plantilla</h2>\n<p>Escribe aquí el contenido...</p>`);
    setCustomEditorOpen(true);
  };

  const handleOpenEdit = (tmpl, e) => {
    e?.stopPropagation();
    setEditingTemplate(tmpl);
    setFormTitle(tmpl.title);
    setFormDescription(tmpl.description || '');
    setFormIcon(tmpl.icon || '📝');
    setFormCategory(tmpl.category || 'Personalizadas');
    setFormContent(tmpl.content);
    setCustomEditorOpen(true);
  };

  const handleCloneSystemTemplate = (tmpl, e) => {
    e?.stopPropagation();
    setEditingTemplate(null);
    setFormTitle(`${tmpl.title} (Mi copia)`);
    setFormDescription(tmpl.description || '');
    setFormIcon(tmpl.icon || '📝');
    setFormCategory('Personalizadas');
    setFormContent(tmpl.content);
    setCustomEditorOpen(true);
  };

  const handleDeleteTemplate = (tmpl, e) => {
    e?.stopPropagation();
    openConfirm({
      title: '¿Eliminar plantilla?',
      message: `¿Estás seguro de que deseas eliminar tu plantilla personalizada "${tmpl.title}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      confirmColor: 'error',
      onConfirm: () => deleteMutation.mutate(tmpl.id),
    });
  };

  const handleSaveCustomTemplate = (e) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error('El título es requerido');
      return;
    }
    if (!formContent.trim()) {
      toast.error('El contenido es requerido');
      return;
    }

    const payload = {
      title: formTitle.trim(),
      description: formDescription.trim(),
      icon: formIcon.trim(),
      category: formCategory.trim() || 'Personalizadas',
      content: formContent.trim(),
    };

    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            borderRadius: 3.5,
            p: 1,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
            backgroundImage: 'none',
          },
        }}
      >
        {/* ── Header ────────────────────────────────────────── */}
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2.5,
                bgcolor: 'primary.main',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SparklesIcon sx={{ fontSize: 20 }} />
            </Box>
            <Box>
              <Typography component="span" variant="h6" fontWeight={800} sx={{ lineHeight: 1.2, display: 'block' }}>
                Catálogo de Plantillas
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {allTemplates.length} plantillas disponibles • Crea, edita y personaliza las tuyas
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<SparklesIcon sx={{ color: '#386c5f' }} />}
              onClick={() => setAiGeneratorOpen(true)}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: 2.5,
                px: 1.8,
                borderColor: 'primary.main',
                background: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(56, 108, 95, 0.2)' : 'rgba(56, 108, 95, 0.08)',
              }}
            >
              Crear con CleoBot
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateNew}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: 2.5,
                px: 1.8,
              }}
            >
              Nueva Plantilla
            </Button>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* ── Search & Filter Controls ────────────────────────── */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Buscar plantilla por título o descripción..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                sx: { borderRadius: 3, bgcolor: 'action.hover' },
              }}
            />

            {/* Category Chips Bar */}
            <Box sx={{ display: 'flex', gap: 0.8, overflowX: 'auto', pb: 0.5 }}>
              {TEMPLATE_CATEGORIES.map((cat) => (
                <Chip
                  key={cat}
                  label={cat}
                  clickable
                  color={activeCategory === cat ? 'primary' : 'default'}
                  variant={activeCategory === cat ? 'filled' : 'outlined'}
                  onClick={() => setActiveCategory(cat)}
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    borderRadius: 2,
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }}
                />
              ))}
            </Box>
          </Box>

          {/* ── Main Layout: Catalog Grid + Live Preview ────────── */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '360px 1fr' },
              gap: 2.5,
              minHeight: 460,
              maxHeight: '60vh',
            }}
          >
            {/* Left: Template Cards List */}
            <Box
              sx={{
                overflowY: 'auto',
                pr: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.2,
              }}
            >
              {filteredTemplates.length === 0 ? (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    {activeCategory === '⭐ Mis Plantillas'
                      ? 'Aún no tienes plantillas personalizadas. ¡Crea una con el botón "+ Nueva Plantilla"!'
                      : 'No se encontraron plantillas con ese filtro.'}
                  </Typography>
                </Box>
              ) : (
                filteredTemplates.map((tmpl) => {
                  const isSelected = selectedTemplate?.id === tmpl.id;
                  return (
                    <Card
                      key={tmpl.id}
                      elevation={0}
                      sx={{
                        borderRadius: 3,
                        border: '2px solid',
                        borderColor: isSelected ? 'primary.main' : 'divider',
                        bgcolor: isSelected
                          ? (theme) =>
                              theme.palette.mode === 'dark'
                                ? 'rgba(56, 108, 95, 0.2)'
                                : 'rgba(56, 108, 95, 0.08)'
                          : 'background.paper',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: 'primary.main',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
                        },
                      }}
                    >
                      <CardActionArea
                        onClick={() => setSelectedId(tmpl.id)}
                        sx={{ p: 1.8, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.8 }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="h5" sx={{ lineHeight: 1 }}>
                              {tmpl.icon}
                            </Typography>
                            <Typography variant="subtitle2" fontWeight={800} noWrap sx={{ maxWidth: 190 }}>
                              {tmpl.title}
                            </Typography>
                          </Box>
                          <Chip
                            label={tmpl.isCustom ? 'Personalizada' : tmpl.category}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              bgcolor: tmpl.isCustom ? 'primary.main' : 'action.hover',
                              color: tmpl.isCustom ? '#fff' : 'text.secondary',
                            }}
                          />
                        </Box>

                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            lineHeight: 1.4,
                          }}
                        >
                          {tmpl.description || 'Sin descripción'}
                        </Typography>

                        {/* Custom Template Controls */}
                        {tmpl.isCustom && (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: 0.5,
                              width: '100%',
                              mt: 0.5,
                              pt: 0.5,
                              borderTop: '1px dashed',
                              borderColor: 'divider',
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Tooltip title="Editar mi plantilla">
                              <IconButton size="small" onClick={(e) => handleOpenEdit(tmpl, e)} sx={{ p: 0.5 }}>
                                <EditIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Eliminar mi plantilla">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={(e) => handleDeleteTemplate(tmpl, e)}
                                sx={{ p: 0.5 }}
                              >
                                <DeleteIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )}
                      </CardActionArea>
                    </Card>
                  );
                })
              )}
            </Box>

            {/* Right: Live Preview Panel */}
            <Box
              sx={{
                bgcolor: 'action.hover',
                borderRadius: 3,
                p: 3,
                overflowY: 'auto',
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              {selectedTemplate ? (
                <>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography variant="h4" sx={{ lineHeight: 1 }}>
                          {selectedTemplate.icon}
                        </Typography>
                        <Box>
                          <Typography variant="h6" fontWeight={800}>
                            {selectedTemplate.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Categoría: {selectedTemplate.category}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Botón de personalizar copia para plantillas del sistema */}
                      {!selectedTemplate.isCustom && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<SparklesIcon sx={{ fontSize: 15 }} />}
                          onClick={(e) => handleCloneSystemTemplate(selectedTemplate, e)}
                          sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', borderRadius: 2 }}
                        >
                          Personalizar copia
                        </Button>
                      )}
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic' }}>
                      {selectedTemplate.description}
                    </Typography>

                    {/* Render HTML preview */}
                    <Box
                      sx={{
                        p: 2.5,
                        borderRadius: 2.5,
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                        fontSize: '0.9rem',
                        lineHeight: 1.6,
                        '& h2': { fontSize: '1.2rem', fontWeight: 800, mt: 1, mb: 1 },
                        '& h3': { fontSize: '1rem', fontWeight: 700, mt: 1.5, mb: 0.5 },
                        '& ul': { pl: 2.5, my: 0.5 },
                        '& blockquote': {
                          borderLeft: '3px solid',
                          borderColor: 'primary.main',
                          pl: 1.5,
                          my: 1,
                          fontStyle: 'italic',
                          color: 'text.secondary',
                        },
                      }}
                      dangerouslySetInnerHTML={{ __html: selectedTemplate.content }}
                    />
                  </Box>

                  {/* Apply Template Action */}
                  <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
                    <Button variant="outlined" onClick={onClose} sx={{ borderRadius: 2.5, px: 2.5, textTransform: 'none' }}>
                      Cancelar
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<CheckIcon />}
                      onClick={handleApply}
                      sx={{
                        borderRadius: 2.5,
                        px: 3,
                        fontWeight: 800,
                        textTransform: 'none',
                        boxShadow: '0 4px 14px rgba(56, 108, 95, 0.35)',
                      }}
                    >
                      Usar esta plantilla
                    </Button>
                  </Box>
                </>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <Typography variant="body2" color="text.secondary">
                    Selecciona una plantilla para previsualizarla
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* ── Sub-Dialog: Create or Edit Custom Template ────────── */}
      <Dialog
        open={customEditorOpen}
        onClose={() => setCustomEditorOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            borderRadius: 3.5,
            p: 1,
            border: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography component="span" variant="h6" fontWeight={800}>
            {editingTemplate ? 'Editar Plantilla Personalizada' : 'Crear Nueva Plantilla Personalizada'}
          </Typography>
          <IconButton size="small" onClick={() => setCustomEditorOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <form onSubmit={handleSaveCustomTemplate}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <TextField
                label="Icono"
                value={formIcon}
                onChange={(e) => setFormIcon(e.target.value)}
                sx={{ width: 80 }}
                size="small"
                inputProps={{ style: { textAlign: 'center', fontSize: '1.2rem' } }}
              />
              <TextField
                label="Título de la Plantilla"
                fullWidth
                required
                size="small"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Ej: Mi Rutina de Mañana..."
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <TextField
                select
                label="Categoría"
                size="small"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                sx={{ width: 200 }}
              >
                {TEMPLATE_CATEGORIES.filter((c) => c !== 'Todas' && c !== '⭐ Mis Plantillas').map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
                <MenuItem value="Personalizadas">Personalizadas</MenuItem>
              </TextField>

              <TextField
                label="Descripción breve"
                fullWidth
                size="small"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Ej: Plantilla para organizar mis tareas y metas de..."
              />
            </Box>

            <TextField
              label="Contenido de la Plantilla (HTML o texto estructurado)"
              multiline
              rows={8}
              fullWidth
              required
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="<h2>Título</h2><p>Contenido...</p>"
              helperText="Puedes escribir texto enriquecido, encabezados <h2>, viñetas <ul><li> o checklists <ul data-type='taskList'><li data-type='taskItem'><label><input type='checkbox'><span></span></label><div><p>Tarea</p></div></li></ul>"
            />
          </DialogContent>

          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setCustomEditorOpen(false)} sx={{ textTransform: 'none' }}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createMutation.isPending || updateMutation.isPending}
              sx={{ fontWeight: 700, borderRadius: 2.5, px: 3, textTransform: 'none' }}
            >
              {editingTemplate ? 'Guardar Cambios' : 'Crear Plantilla'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Modal Generador de Plantillas con IA (CleoBot) */}
      {aiGeneratorOpen && (
        <AiTemplateGeneratorModal
          open={aiGeneratorOpen}
          onClose={() => setAiGeneratorOpen(false)}
          onApplyTemplate={(tmpl) => {
            onSelectTemplate(tmpl);
            onClose();
          }}
          onSaveToCustomTemplates={(tmplPayload) => {
            createMutation.mutate(tmplPayload);
          }}
        />
      )}
    </>
  );
}
