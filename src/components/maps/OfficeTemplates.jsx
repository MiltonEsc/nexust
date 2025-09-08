import React from 'react';

export const officeTemplates = {
  'small-office': {
    name: 'Oficina Pequeña',
    description: 'Ideal para 5-10 personas',
    areas: [
      {
        id: 'reception',
        name: 'Recepción',
        x: 50,
        y: 50,
        width: 200,
        height: 100,
        color: '#E5E7EB',
        borderColor: '#9CA3AF'
      },
      {
        id: 'open-space',
        name: 'Área de Trabajo',
        x: 300,
        y: 50,
        width: 300,
        height: 200,
        color: '#F3F4F6',
        borderColor: '#9CA3AF'
      },
      {
        id: 'meeting-room',
        name: 'Sala de Reuniones',
        x: 50,
        y: 200,
        width: 150,
        height: 120,
        color: '#DBEAFE',
        borderColor: '#3B82F6'
      },
      {
        id: 'storage',
        name: 'Almacén',
        x: 250,
        y: 200,
        width: 150,
        height: 120,
        color: '#F3E8FF',
        borderColor: '#8B5CF6'
      }
    ]
  },
  'medium-office': {
    name: 'Oficina Mediana',
    description: 'Ideal para 10-25 personas',
    areas: [
      {
        id: 'reception',
        name: 'Recepción',
        x: 50,
        y: 50,
        width: 200,
        height: 100,
        color: '#E5E7EB',
        borderColor: '#9CA3AF'
      },
      {
        id: 'open-space-1',
        name: 'Área Abierta 1',
        x: 300,
        y: 50,
        width: 300,
        height: 150,
        color: '#F3F4F6',
        borderColor: '#9CA3AF'
      },
      {
        id: 'open-space-2',
        name: 'Área Abierta 2',
        x: 650,
        y: 50,
        width: 300,
        height: 150,
        color: '#F3F4F6',
        borderColor: '#9CA3AF'
      },
      {
        id: 'meeting-room-1',
        name: 'Sala de Reuniones 1',
        x: 50,
        y: 200,
        width: 150,
        height: 120,
        color: '#DBEAFE',
        borderColor: '#3B82F6'
      },
      {
        id: 'meeting-room-2',
        name: 'Sala de Reuniones 2',
        x: 250,
        y: 200,
        width: 150,
        height: 120,
        color: '#DBEAFE',
        borderColor: '#3B82F6'
      },
      {
        id: 'server-room',
        name: 'Sala de Servidores',
        x: 50,
        y: 350,
        width: 200,
        height: 100,
        color: '#FEF3C7',
        borderColor: '#F59E0B'
      },
      {
        id: 'storage',
        name: 'Almacén',
        x: 300,
        y: 350,
        width: 200,
        height: 100,
        color: '#F3E8FF',
        borderColor: '#8B5CF6'
      },
      {
        id: 'break-room',
        name: 'Sala de Descanso',
        x: 550,
        y: 200,
        width: 150,
        height: 120,
        color: '#ECFDF5',
        borderColor: '#10B981'
      }
    ]
  },
  'large-office': {
    name: 'Oficina Grande',
    description: 'Ideal para 25+ personas',
    areas: [
      {
        id: 'reception',
        name: 'Recepción',
        x: 50,
        y: 50,
        width: 250,
        height: 120,
        color: '#E5E7EB',
        borderColor: '#9CA3AF'
      },
      {
        id: 'open-space-1',
        name: 'Área Abierta 1',
        x: 350,
        y: 50,
        width: 300,
        height: 200,
        color: '#F3F4F6',
        borderColor: '#9CA3AF'
      },
      {
        id: 'open-space-2',
        name: 'Área Abierta 2',
        x: 700,
        y: 50,
        width: 300,
        height: 200,
        color: '#F3F4F6',
        borderColor: '#9CA3AF'
      },
      {
        id: 'open-space-3',
        name: 'Área Abierta 3',
        x: 350,
        y: 300,
        width: 300,
        height: 200,
        color: '#F3F4F6',
        borderColor: '#9CA3AF'
      },
      {
        id: 'meeting-room-1',
        name: 'Sala de Reuniones 1',
        x: 50,
        y: 200,
        width: 150,
        height: 120,
        color: '#DBEAFE',
        borderColor: '#3B82F6'
      },
      {
        id: 'meeting-room-2',
        name: 'Sala de Reuniones 2',
        x: 250,
        y: 200,
        width: 150,
        height: 120,
        color: '#DBEAFE',
        borderColor: '#3B82F6'
      },
      {
        id: 'meeting-room-3',
        name: 'Sala de Reuniones 3',
        x: 50,
        y: 350,
        width: 150,
        height: 120,
        color: '#DBEAFE',
        borderColor: '#3B82F6'
      },
      {
        id: 'server-room',
        name: 'Sala de Servidores',
        x: 50,
        y: 500,
        width: 200,
        height: 100,
        color: '#FEF3C7',
        borderColor: '#F59E0B'
      },
      {
        id: 'storage',
        name: 'Almacén',
        x: 300,
        y: 500,
        width: 200,
        height: 100,
        color: '#F3E8FF',
        borderColor: '#8B5CF6'
      },
      {
        id: 'break-room',
        name: 'Sala de Descanso',
        x: 700,
        y: 300,
        width: 200,
        height: 120,
        color: '#ECFDF5',
        borderColor: '#10B981'
      },
      {
        id: 'kitchen',
        name: 'Cocina',
        x: 700,
        y: 450,
        width: 150,
        height: 100,
        color: '#FEF2F2',
        borderColor: '#EF4444'
      }
    ]
  },
  'warehouse': {
    name: 'Almacén/Bodega',
    description: 'Ideal para almacenamiento y logística',
    areas: [
      {
        id: 'reception',
        name: 'Recepción',
        x: 50,
        y: 50,
        width: 200,
        height: 100,
        color: '#E5E7EB',
        borderColor: '#9CA3AF'
      },
      {
        id: 'storage-zone-a',
        name: 'Zona A',
        x: 300,
        y: 50,
        width: 300,
        height: 200,
        color: '#F3E8FF',
        borderColor: '#8B5CF6'
      },
      {
        id: 'storage-zone-b',
        name: 'Zona B',
        x: 650,
        y: 50,
        width: 300,
        height: 200,
        color: '#F3E8FF',
        borderColor: '#8B5CF6'
      },
      {
        id: 'storage-zone-c',
        name: 'Zona C',
        x: 300,
        y: 300,
        width: 300,
        height: 200,
        color: '#F3E8FF',
        borderColor: '#8B5CF6'
      },
      {
        id: 'storage-zone-d',
        name: 'Zona D',
        x: 650,
        y: 300,
        width: 300,
        height: 200,
        color: '#F3E8FF',
        borderColor: '#8B5CF6'
      },
      {
        id: 'loading-dock',
        name: 'Muelle de Carga',
        x: 50,
        y: 200,
        width: 200,
        height: 150,
        color: '#FEF3C7',
        borderColor: '#F59E0B'
      },
      {
        id: 'office',
        name: 'Oficina',
        x: 50,
        y: 400,
        width: 200,
        height: 100,
        color: '#DBEAFE',
        borderColor: '#3B82F6'
      }
    ]
  }
};

export default officeTemplates;
