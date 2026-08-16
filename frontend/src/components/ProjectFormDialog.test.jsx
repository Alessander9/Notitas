import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProjectFormDialog from './ProjectFormDialog';
import { getProjectIcon, COLOR_OPTIONS, ICON_OPTIONS } from '../constants/projectOptions';

const defaults = {
  open: true,
  onClose: vi.fn(),
  isEditing: false,
  name: '',
  onNameChange: vi.fn(),
  description: '',
  onDescriptionChange: vi.fn(),
  color: '#386c5f',
  onColorChange: vi.fn(),
  icon: 'folder',
  onIconChange: vi.fn(),
  previewUrl: null,
  onFileChange: vi.fn(),
  onRemoveCover: vi.fn(),
  isPending: false,
  onSubmit: vi.fn(),
};

describe('ProjectFormDialog', () => {
  it('renderiza en modo crear con el botón "Crear proyecto" deshabilitado sin nombre', () => {
    render(<ProjectFormDialog {...defaults} />);

    expect(screen.getByText('Nuevo Proyecto')).toBeInTheDocument();
    const submit = screen.getByRole('button', { name: /Crear proyecto/i });
    expect(submit).toBeDisabled();
  });

  it('habilita el botón al escribir un nombre (normalizando el evento MUI)', () => {
    render(<ProjectFormDialog {...defaults} />);

    fireEvent.change(screen.getByLabelText(/Nombre del proyecto/), { target: { value: 'Mi proyecto' } });

    // Los padres reciben el valor, no el SyntheticEvent
    expect(defaults.onNameChange).toHaveBeenCalledWith('Mi proyecto');
  });

  it('envía el formulario al pulsar crear', () => {
    render(<ProjectFormDialog {...defaults} name="Proyecto X" />);

    fireEvent.click(screen.getByRole('button', { name: /Crear proyecto/i }));

    expect(defaults.onSubmit).toHaveBeenCalled();
  });

  it('renderiza en modo edición con el botón "Guardar cambios"', () => {
    render(<ProjectFormDialog {...defaults} isEditing name="Proyecto" />);

    expect(screen.getByText('Editar Proyecto')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Guardar cambios/i })).toBeEnabled();
  });

  it('muestra el spinner y deshabilita mientras guarda', () => {
    render(<ProjectFormDialog {...defaults} name="Proyecto" isPending />);

    expect(screen.getByText('Guardando...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Guardando/i })).toBeDisabled();
  });

  it('seleccionar un color y un icono llama a los callbacks', () => {
    render(<ProjectFormDialog {...defaults} name="P" />);

    // Icono "code" (💻)
    fireEvent.click(screen.getByText('💻'));
    expect(defaults.onIconChange).toHaveBeenCalledWith('code');

    // Swatches identificados por data-testid (los Tooltip de MUI no usan title)
    fireEvent.click(screen.getByTestId('color-#E63946'));
    expect(defaults.onColorChange).toHaveBeenCalledWith('#E63946');
  });

  it('getProjectIcon devuelve el emoji correcto o la carpeta por defecto', () => {
    expect(getProjectIcon('rocket')).toBe('🚀');
    expect(getProjectIcon('no-existe')).toBe('📁');
    expect(COLOR_OPTIONS.length).toBeGreaterThan(20);
    expect(ICON_OPTIONS.length).toBeGreaterThan(30);
  });

  it('muestra la vista previa de portada y la etiqueta de GIF', () => {
    render(<ProjectFormDialog {...defaults} name="P" previewUrl="/uploads/cov.png" />);

    expect(screen.getByAltText('Vista previa de la portada')).toBeInTheDocument();
    expect(screen.getByText('GIF soportado')).toBeInTheDocument();
  });

  it('cancelar cierra el diálogo', () => {
    render(<ProjectFormDialog {...defaults} />);

    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));

    expect(defaults.onClose).toHaveBeenCalled();
  });
});
