import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CalculatorModal from './CalculatorModal';

describe('CalculatorModal', () => {
  it('realiza operaciones aritméticas básicas correctamente', () => {
    const onInsertText = vi.fn();
    const onClose = vi.fn();

    render(<CalculatorModal open={true} onClose={onClose} onInsertText={onInsertText} />);

    expect(screen.getByText(/Calculadora Integrada/i)).toBeInTheDocument();

    // Click 7, +, 5, =
    fireEvent.click(screen.getByRole('button', { name: '7' }));
    fireEvent.click(screen.getByRole('button', { name: '+' }));
    fireEvent.click(screen.getByRole('button', { name: '5' }));
    fireEvent.click(screen.getByRole('button', { name: '=' }));

    // Resultado 12
    expect(screen.getByText('12')).toBeInTheDocument();

    // Pegar resultado
    fireEvent.click(screen.getByRole('button', { name: /Pegar Resultado/i }));
    expect(onInsertText).toHaveBeenCalledWith('12');
    expect(onClose).toHaveBeenCalled();
  });
});
