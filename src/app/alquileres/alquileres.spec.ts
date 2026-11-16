import { NotariosService } from '../notarios.service';
import { PropietariosService } from '../propietarios.service';
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
    id: 12, propietarioID: 1, propiedadID: 1, inquilinoID: 2,
    fechaInicio: '2026-01-01', fechaFin: '2026-12-31', lugarFirma: 'Santo Domingo, Distrito Nacional', fechaFirma: '2026-01-01', montoPago: 15000,
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
      inquilinos as InquilinosService, { markForCheck: () => {} } as ChangeDetectorRef, { obtenerPropietarios: () => of({ success: true, data: [] }) } as unknown as PropietariosService, { obtenerNotarios: () => of({ success: true, data: [] }) } as unknown as NotariosService);
  });


  it('conserva el notario al editar y valida la fecha y lugar de certificación', () => {
    component.notarios = [{ id: 7, nombreCompleto: 'Notario', cedula: 'N-1', matricula: 'M-1',
      jurisdiccion: 'Santiago', direccion: 'Despacho' }];
    component.editar({ ...contrato, notarioID: 7, lugarCertificacion: 'Santiago', fechaCertificacion: '2026-02-31' });
    component.guardar();
    expect(service.actualizar).not.toHaveBeenCalled();
    expect(component.errorFormulario).toContain('certificación');
    component.formulario.fechaCertificacion = '2026-11-15';
    component.guardar();
    expect(service.actualizar).toHaveBeenCalledWith(12, jasmine.objectContaining({
      notarioID: 7, lugarCertificacion: 'Santiago', fechaCertificacion: '2026-11-15'
    }));
  });
  it('impide imprimir con un notario asociado que no se pudo cargar', () => {
    const abrir = spyOn(window, 'open');
    component.generarContrato({ ...contrato, notarioID: 7 });
    expect(abrir).not.toHaveBeenCalled();
    expect(component.error).toContain('notario asociado');
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

  it('calcula la vigencia y envía los meses y la fecha final al guardar', () => {
    component.editar(contrato);
    component.formulario.fechaInicio = '2026-11-13';
    component.formulario.cantidadMeses = 12;
    component.guardar();
    expect(service.actualizar).toHaveBeenCalledWith(12, jasmine.objectContaining({ cantidadMeses: 12, fechaFin: '2027-11-13' }));
  });
  it('ajusta fines de mes, años bisiestos y cambios de año', () => {
    for (const [inicio, meses, fin] of [
      ['2026-01-31', 1, '2026-02-28'], ['2028-01-31', 1, '2028-02-29'],
      ['2028-02-29', 12, '2029-02-28'], ['2026-11-13', 3, '2027-02-13']
    ] as const) {
      component.formulario.fechaInicio = inicio;
      component.formulario.cantidadMeses = meses;
      component.recalcularFechaFin();
      expect(component.formulario.fechaFin).toBe(fin);
    }
  });
  it('limpia la fecha calculada si faltan datos o son inválidos', () => {
    component.formulario.fechaInicio = '2026-02-31';
    component.formulario.cantidadMeses = 1;
    component.recalcularFechaFin();
    expect(component.formulario.fechaFin).toBe('');
    component.formulario.fechaInicio = '2026-11-13';
    for (const meses of [null, 0, -1, 1.5]) {
      component.formulario.cantidadMeses = meses;
      component.recalcularFechaFin();
      expect(component.formulario.fechaFin).toBe('');
    }
  });
  it('recupera los meses de contratos anteriores y recalcula al renovar', () => {
    component.renovar(contrato);
    expect(component.formulario.cantidadMeses).toBe(12);
    expect(component.formulario.fechaFin).toBe(contrato.fechaFin);
    component.formulario.fechaInicio = '2027-01-01';
    component.recalcularFechaFin();
    expect(component.formulario.fechaFin).toBe('2028-01-01');
  });
  it('calcula depósitos al cambiar la cantidad o la renta y permite guardar un total ajustado', () => {
    component.editar(contrato);
    component.formulario.cantidadDepositos = 3;
    component.recalcularDepositos();
    expect(component.formulario.montoTotalDepositos).toBe(45000);
    component.formulario.montoPago = 17000;
    component.recalcularDepositos();
    expect(component.formulario.montoTotalDepositos).toBe(51000);
    component.formulario.montoTotalDepositos = 50000;
    component.guardar();
    expect(service.actualizar).toHaveBeenCalledWith(12, jasmine.objectContaining({
      cantidadDepositos: 3, montoTotalDepositos: 50000,
      lugarFirma: 'Santo Domingo, Distrito Nacional', fechaFirma: '2026-01-01'
    }));
  });
  it('conserva un total personalizado al editar y renovar', () => {
    component.renovar({ ...contrato, montoTotalDepositos: 25000 });
    expect(component.formulario.montoTotalDepositos).toBe(25000);
    expect(component.formulario.fechaFirma).toBe(contrato.fechaFirma);
    component.guardar();
    expect(service.crear).toHaveBeenCalledWith(jasmine.objectContaining({ montoTotalDepositos: 25000 }));
  });
  it('valida depósitos no negativos y una fecha de firma real', () => {
    component.editar(contrato);
    component.formulario.cantidadDepositos = -1;
    component.guardar();
    expect(service.actualizar).not.toHaveBeenCalled();
    component.formulario.cantidadDepositos = 2;
    component.formulario.fechaFirma = '2026-02-31';
    component.guardar();
    expect(service.actualizar).not.toHaveBeenCalled();
    expect(component.errorFormulario).toContain('firma');
  });
  it('guarda garante y monto al editar el contrato existente', () => {
    component.editar(contrato);
    component.garantesFormulario[0].nombre_completo = 'Luis Gómez';
    component.guardar();
    expect(service.actualizar).toHaveBeenCalledWith(12, jasmine.objectContaining({ garanteNombreCompleto: 'Luis Gómez', montoPago: 15000 }));
    expect(service.crear).not.toHaveBeenCalled();
  });

  it('rechaza meses inválidos y datos incompletos del garante', () => {
    component.renovar(contrato);
    component.formulario.cantidadMeses = 0;
    component.guardar();
    expect(service.crear).not.toHaveBeenCalled();
    component.formulario.cantidadMeses = 12;
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
    id: 24, propietarioID: 1, propiedadID: 1, inquilinoID: 2, montoPago: 12000,
    fechaInicio: '2026-01-01', fechaFin: '2026-12-31', lugarFirma: 'Santo Domingo, Distrito Nacional', fechaFirma: '2026-01-01',
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
      { markForCheck: () => {} } as ChangeDetectorRef, { obtenerPropietarios: () => of({ success: true, data: [] }) } as unknown as PropietariosService, { obtenerNotarios: () => of({ success: true, data: [] }) } as unknown as NotariosService);
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
