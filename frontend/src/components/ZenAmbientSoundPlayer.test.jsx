import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ZenAmbientSoundPlayer from './ZenAmbientSoundPlayer';

vi.mock('../utils/ambientAudioSynthesizer', () => ({
  ambientSynthesizer: {
    playRain: vi.fn(),
    playWaves: vi.fn(),
    playCafe: vi.fn(),
    playForest: vi.fn(),
    playWhiteNoise: vi.fn(),
    stop: vi.fn(),
    setVolume: vi.fn(),
    setSleepTimer: vi.fn(),
  },
}));

describe('ZenAmbientSoundPlayer', () => {
  it('renderiza todos los botones de ambientes sonoros y controles', () => {
    const anchor = document.createElement('button');
    render(
      <ZenAmbientSoundPlayer
        open={true}
        anchorEl={anchor}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Sonidos de Concentración')).toBeInTheDocument();
    expect(screen.getByText('Lluvia')).toBeInTheDocument();
    expect(screen.getByText('Olas')).toBeInTheDocument();
    expect(screen.getByText('Café')).toBeInTheDocument();
    expect(screen.getByText('Bosque')).toBeInTheDocument();
    expect(screen.getByText('Ruido Blanco')).toBeInTheDocument();
    expect(screen.getByText('Detener')).toBeInTheDocument();
  });
});
