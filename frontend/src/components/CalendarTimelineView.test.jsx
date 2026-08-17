import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CalendarTimelineView from './CalendarTimelineView';

const MOCK_NOTES = [
  {
    id: 1,
    title: 'Nota de Lanzamiento',
    content: '<p>Contenido</p>',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['sprint'],
  },
  {
    id: 2,
    title: 'Planificación Q3',
    content: '<p>Objetivos</p>',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['estrategia'],
  },
];

describe('CalendarTimelineView', () => {
  it('renderiza la vista mensual con los días de la semana y las notas asignadas', () => {
    const onNoteClick = vi.fn();
    render(<CalendarTimelineView notes={MOCK_NOTES} onNoteClick={onNoteClick} />);

    expect(screen.getByText('Lun')).toBeInTheDocument();
    expect(screen.getByText('Dom')).toBeInTheDocument();
    expect(screen.getByText('Nota de Lanzamiento')).toBeInTheDocument();

    // Click en la nota
    fireEvent.click(screen.getByText('Nota de Lanzamiento'));
    expect(onNoteClick).toHaveBeenCalledWith(1);
  });

  it('permite alternar a la vista Timeline', () => {
    render(<CalendarTimelineView notes={MOCK_NOTES} onNoteClick={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Timeline/i }));
    expect(screen.getByText('Planificación Q3')).toBeInTheDocument();
  });
});
