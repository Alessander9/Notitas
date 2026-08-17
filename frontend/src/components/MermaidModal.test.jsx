import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MermaidModal from './MermaidModal';

describe('MermaidModal', () => {
  it('permite seleccionar presets de diagramas y emite la url renderizada', () => {
    const onClose = vi.fn();
    const onInsertDiagram = vi.fn();

    render(
      <MermaidModal
        open={true}
        onClose={onClose}
        onInsertDiagram={onInsertDiagram}
      />
    );

    expect(screen.getByText(/Diagramas Mermaid.js/i)).toBeInTheDocument();
    expect(screen.getByText('Secuencia')).toBeInTheDocument();

    // Cambiar preset
    fireEvent.click(screen.getByText('Secuencia'));

    // Insertar diagrama
    const insertBtn = screen.getByRole('button', { name: /Incrustar Diagrama/i });
    fireEvent.click(insertBtn);

    expect(onInsertDiagram).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
