import { ChangeDetectorRef } from '@angular/core';
import { of, throwError } from 'rxjs';
import { Alquileres } from './alquileres';
import { Alquiler, AlquileresService } from '../alquileres.service';
import { PropiedadesService } from '../propiedades.service';
import { InquilinosService } from '../inquilinos.service';

describe('Contratos', () => {
  let component: Alquileres;
  let service: jasmine.SpyObj<AlquileresService>;
  const contrato: Alquiler = {
    id: 12, propiedadID: 1, inquilinoID: 2,
    fechaInicio: '2026-01-01', fechaFin: '2026-12-31', montoPago: 15000,
    garanteCedula: '001-0000000-1', garanteNombreCompleto: 'Ana Pérez',
    diaPago: 5, diasProrroga: 3, cantidadDepositos: 2
  };

  beforeEach(() => {
    service = jasmine.createSpyObj('AlquileresService', ['crear', 'actualizar', 'obtenerAlquileres']);
    service.crear.and.returnValue(of({ success: true, data: { ...contrato, id: 13 } }));
    service.actualizar.and.returnValue(of({ success: true, data: contrato }));
    service.obtenerAlquileres.and.returnValue(of({ success: true, data: [contrato] }));
    const propiedades = jasmine.createSpyObj('PropiedadesService', ['obtenerPropiedades']);
    propiedades.obtenerPropiedades.and.returnValue(of({ success: true, data: [] }));
    const inquilinos = jasmine.createSpyObj('InquilinosService', ['obtenerInquilinos']);
    inquilinos.obtenerInquilinos.and.returnValue(of({ success: true, data: [] }));
    component = new Alquileres(service, propiedades as PropiedadesService,
      inquilinos as InquilinosService, { markForCheck: () => {} } as ChangeDetectorRef);
  });

  it('renueva con una inserción y conserva intacto el contrato original', () => {
    const original = { ...contrato };
    component.renovar(contrato);
    expect(component.garantesFormulario[0].nombre_completo).toBe('Ana Pérez');
    expect(component.formulario.diaPago).toBe(5);
    component.formulario.fechaInicio = '2027-01-01';
    component.formulario.fechaFin = '2027-12-31';
    component.formulario.montoPago = 17000;
    component.guardar();
    expect(service.actualizar).not.toHaveBeenCalled();
    const datos = service.crear.calls.mostRecent().args[0];
    expect(datos).toEqual(jasmine.objectContaining({ fechaInicio: '2027-01-01', montoPago: 17000, garanteCedula: original.garanteCedula }));
    expect('id' in datos).toBeFalse();
    expect(contrato).toEqual(original);
  });

  it('guarda garante y monto al editar el contrato existente', () => {
    component.editar(contrato);
    component.garantesFormulario[0].nombre_completo = 'Luis Gómez';
    component.guardar();
    expect(service.actualizar).toHaveBeenCalledWith(12, jasmine.objectContaining({ garanteNombreCompleto: 'Luis Gómez', montoPago: 15000 }));
    expect(service.crear).not.toHaveBeenCalled();
  });

  it('rechaza fechas invertidas y datos incompletos del garante', () => {
    component.renovar(contrato);
    component.formulario.fechaFin = '2025-01-01';
    component.guardar();
    expect(service.crear).not.toHaveBeenCalled();
    component.formulario.fechaFin = '2027-01-01';
    component.garantesFormulario[0].cedula = ' ';
    component.guardar();
    expect(service.crear).not.toHaveBeenCalled();
    expect(component.errorFormulario).toContain('garante');
  });

  it('mantiene los datos para reintentar después de un error', () => {
    service.crear.and.returnValue(throwError(() => new Error('sin conexión')));
    component.renovar(contrato);
    component.guardar();
    expect(component.formularioAbierto).toBeTrue();
    expect(component.renovandoId).toBe(12);
    expect(component.guardando).toBeFalse();
    expect(component.errorFormulario).toContain('No se pudo guardar');
  });

  it('genera un documento imprimible sin interpretar los nombres como HTML', () => {
    const doc = document.implementation.createHTMLDocument();
    const imprimir = jasmine.createSpy('print');
    spyOn(window, 'open').and.returnValue({ document: doc, print: imprimir, opener: null } as unknown as Window);
    component.generarContrato({ ...contrato, garanteNombreCompleto: '<img src=x onerror=alert(1)>' });
    expect(doc.body.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(doc.querySelector('img')).toBeNull();
    expect(doc.body.textContent).toContain('001-0000000-1');
    doc.querySelector('button')!.click();
    expect(imprimir).toHaveBeenCalled();
  });
});

describe('Varios garantes por contrato', () => {
  let component: Alquileres;
  let service: jasmine.SpyObj<AlquileresService>;
  const contrato: Alquiler = {
    id: 24, propiedadID: 1, inquilinoID: 2, montoPago: 12000,
    fechaInicio: '2026-01-01', fechaFin: '2026-12-31',
    garantes: [
      { id: 1, alquiler_id: 24, cedula: '001-01', nombre_completo: 'Primer garante' },
      { id: 2, alquiler_id: 24, cedula: '001-02', nombre_completo: 'Segundo garante' }
    ]
  };
  beforeEach(() => {
    service = jasmine.createSpyObj('AlquileresService', ['crear', 'actualizar']);
    service.crear.and.returnValue(throwError(() => new Error('prueba')));
    service.actualizar.and.returnValue(throwError(() => new Error('prueba')));
    component = new Alquileres(service, {} as PropiedadesService, {} as InquilinosService,
      { markForCheck: () => {} } as ChangeDetectorRef);
  });
  it('renueva todos los garantes sin modificar la lista original ni copiar sus identidades', () => {
    component.renovar(contrato);
    component.garantesFormulario[1].nombre_completo = 'Nombre modificado';
    component.guardar();
    const datos = service.crear.calls.mostRecent().args[0];
    expect(datos.garantes?.length).toBe(2);
    expect(datos.garantes?.[1]).toEqual({ cedula: '001-02', nombre_completo: 'Nombre modificado' });
    expect(contrato.garantes?.[1].nombre_completo).toBe('Segundo garante');
    expect(service.actualizar).not.toHaveBeenCalled();
  });
  it('permite quitar todos los garantes', () => {
    component.editar(contrato);
    component.quitarGarante(1);
    component.quitarGarante(0);
    component.guardar();
    expect(service.actualizar).toHaveBeenCalledWith(24, jasmine.objectContaining({
      garantes: [], garanteCedula: null, garanteNombreCompleto: null
    }));
  });
  it('rechaza cédulas duplicadas aunque tengan separadores distintos', () => {
    component.editar(contrato);
    component.garantesFormulario[1].cedula = '00101';
    component.guardar();
    expect(service.actualizar).not.toHaveBeenCalled();
    expect(component.errorFormulario).toContain('diferente');
  });
  it('permite agregar filas y exige completar cada garante', () => {
    component.editar(contrato);
    component.agregarGarante();
    expect(component.garantesFormulario.length).toBe(3);
    component.guardar();
    expect(service.actualizar).not.toHaveBeenCalled();
    expect(component.errorFormulario).toContain('cada garante');
  });
  it('incluye a todos los garantes en el documento generado', () => {
    const doc = document.implementation.createHTMLDocument();
    spyOn(window, 'open').and.returnValue({ document: doc, opener: null } as unknown as Window);
    component.generarContrato(contrato);
    expect(doc.body.textContent).toContain('Primer garante');
    expect(doc.body.textContent).toContain('Segundo garante');
    expect(doc.body.textContent).toContain('001-02');
    expect(doc.querySelectorAll('.firmas span').length).toBe(4);
  });
});
