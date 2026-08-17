import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PresentationModal from './PresentationModal';

describe('PresentationModal', () => {
  it('renderiza la presentación con encabezados divididos en diapositivas', () => {
    const onClose = vi.fn();
    const content = '<h1>Introducción</h1><p>Bienvenido al proyecto.</p><h2>Objetivos</h2><p>Lanzar la app.</p>';

    render(
      <PresentationModal
        open={true}
        onClose={onClose}
        noteTitle="Reunión Sprint"
        noteContent={content}
      />
    );

    expect(screen.getByText('Reunión Sprint')).toBeInTheDocument();
    expect(screen.getByText('Introducción')).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();

    // Avanzar a la siguiente diapositiva
    const nextButtons = screen.getAllByRole('button');
    const nextBtn = nextButtons[nextButtons.length - 1]; // último botón es siguiente
    fireEvent.click(nextBtn);

    expect(screen.getByText('2 / 2')).toBeInTheDocument();
  });
});
