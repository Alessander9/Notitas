import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SpeechDictationModal from './SpeechDictationModal';

describe('SpeechDictationModal', () => {
  beforeEach(() => {
    // Mock Web Speech API
    window.SpeechRecognition = class MockSpeechRecognition {
      constructor() {
        this.continuous = true;
        this.interimResults = true;
        this.lang = 'es-PE';
      }
      start() {
        if (this.onstart) this.onstart();
      }
      stop() {
        if (this.onend) this.onend();
      }
      abort() {}
    };
  });

  it('renderiza el modal de dictado por voz en vivo y sus controles', () => {
    const onClose = vi.fn();
    const onInsertText = vi.fn();

    render(
      <SpeechDictationModal
        open={true}
        onClose={onClose}
        onInsertText={onInsertText}
      />
    );

    expect(screen.getByText(/Dictado por Voz en Vivo/i)).toBeInTheDocument();
    expect(screen.getByText(/Puntuación inteligente/i)).toBeInTheDocument();
    expect(screen.getByText(/Insertar en la Nota/i)).toBeInTheDocument();
  });

  it('permite alternar el estado del micrófono', () => {
    const onClose = vi.fn();
    const onInsertText = vi.fn();

    render(
      <SpeechDictationModal
        open={true}
        onClose={onClose}
        onInsertText={onInsertText}
      />
    );

    const btn = screen.getByRole('button', { name: /Detener Micrófono|Comenzar a Dictar/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
  });
});
