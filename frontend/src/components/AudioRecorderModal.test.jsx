import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AudioRecorderModal from './AudioRecorderModal';

describe('AudioRecorderModal', () => {
  it('renderiza la grabadora de voz con estado inicial', () => {
    const onClose = vi.fn();
    const onInsertAudio = vi.fn();

    render(
      <AudioRecorderModal
        open={true}
        onClose={onClose}
        onInsertAudio={onInsertAudio}
      />
    );

    expect(screen.getByText(/Grabadora de Voz/i)).toBeInTheDocument();
    expect(screen.getByText('0:00')).toBeInTheDocument();
  });
});
