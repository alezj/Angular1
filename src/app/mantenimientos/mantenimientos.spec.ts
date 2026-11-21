import { ChangeDetectorRef, ErrorHandler, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { EstadosService } from '../estados.service';
import { ApiResponse, Mantenimiento, MantenimientosService } from '../mantenimientos.service';
import { PropiedadesService } from '../propiedades.service';
import { Mantenimientos } from './mantenimientos';

const solicitud: Mantenimiento = {
  id: 11, propiedadID: 2, descripcion: 'Reparar filtración', fecha: '2026-11-17', costo: 1500,
  estado: 5
};

describe('Tablero Kanban de mantenimientos', () => {
  let component: Mantenimientos;
  let service: jasmine.SpyObj<MantenimientosService>;
  let auth: jasmine.SpyObj<AuthService>;
  let estados: jasmine.SpyObj<EstadosService>;
  let respuesta: Subject<ApiResponse<Mantenimiento>>;
  let propiedades: jasmine.SpyObj<PropiedadesService>;

  beforeEach(() => {
    service = jasmine.createSpyObj('MantenimientosService', [
      'obtenerMantenimientos', 'cambiarEstado', 'crear', 'actualizar', 'eliminar'
    ]);
    service.obtenerMantenimientos.and.returnValue(of({ success: true, data: [{ ...solicitud }] }));
    respuesta = new Subject<ApiResponse<Mantenimiento>>();
    service.cambiarEstado.and.returnValue(respuesta);
    auth = jasmine.createSpyObj('AuthService', ['hasPermission']);
    auth.hasPermission.and.returnValue(true);
    estados = jasmine.createSpyObj('EstadosService', ['obtenerEstados']);
    estados.obtenerEstados.and.returnValue(of({ success: true, data: [
      { ID: 5, Descripcion: 'Pendiente', tabla: 'mantenimientos' },
      { ID: 6, Descripcion: 'En proceso', tabla: 'mantenimientos' },
      { ID: 7, Descripcion: 'Finalizado', tabla: 'mantenimientos' },
      { ID: 8, Descripcion: 'Cancelado', tabla: 'mantenimientos' }
    ] }));
    propiedades = jasmine.createSpyObj('PropiedadesService', ['obtenerPropiedades']);
    propiedades.obtenerPropiedades.and.returnValue(of({ success: true, data: [
      { id: 2, nombre: 'Casa de prueba', direccion: 'Calle de prueba', codigo: 'CASA-2',
        estado: 1, precioMensual: 12000, notas: '' }
    ] }));
    component = new Mantenimientos(service, { markForCheck: () => {} } as ChangeDetectorRef,
      auth, estados, propiedades);
    component.ngOnInit();
  });

  it('mueve de inmediato, actualiza contadores y confirma los datos devueltos al guardar', () => {
    component.moverSolicitud(11, 6);
    expect(component.solicitudesPorEstado(5).length).toBe(0);
    expect(component.solicitudesPorEstado(6).length).toBe(1);
    expect(component.movimientosPendientes.has(11)).toBeTrue();
    expect(service.cambiarEstado).toHaveBeenCalledOnceWith(11, 6);
    respuesta.next({ success: true, data: { ...solicitud, estado: 6 } });
    expect(component.movimientosPendientes.size).toBe(0);
    expect(component.mensaje).toContain('En proceso');
  });

  it('restaura solo la tarjeta que falla sin deshacer movimientos de otras solicitudes', () => {
    component.mantenimientos.push({ ...solicitud, id: 12 });
    const segunda = new Subject<ApiResponse<Mantenimiento>>();
    service.cambiarEstado.and.returnValues(respuesta, segunda);
    component.moverSolicitud(11, 6);
    component.moverSolicitud(12, 7);
    segunda.next({ success: true, data: { ...solicitud, id: 12, estado: 7 } });
    respuesta.error(new Error('Sin conexión'));
    expect(component.mantenimientos.find(m => m.id === 11)?.estado).toBe(5);
    expect(component.mantenimientos.find(m => m.id === 12)?.estado).toBe(7);
    expect(component.movimientosPendientes.size).toBe(0);
    expect(component.error).toContain('Se restauró');
  });

  it('también revierte una respuesta no exitosa y permite reintentar', () => {
    component.moverSolicitud(11, 6);
    respuesta.next({ success: false, data: solicitud });
    component.moverSolicitud(11, 7);
    expect(service.cambiarEstado.calls.count()).toBe(2);
    expect(component.error).toBeNull();
  });

  it('evita duplicados, estados inválidos y cambios sin permiso', () => {
    component.moverSolicitud(11, 5);
    component.moverSolicitud(11, 99);
    auth.hasPermission.and.returnValue(false);
    component.moverSolicitud(11, 6);
    expect(service.cambiarEstado).not.toHaveBeenCalled();
    auth.hasPermission.and.returnValue(true);
    component.moverSolicitud(11, 6);
    component.moverSolicitud(11, 7);
    expect(service.cambiarEstado).toHaveBeenCalledTimes(1);
  });

  it('carga los IDs del catálogo y deja visibles los registros con estados antiguos', () => {
    component.mantenimientos.push({ ...solicitud, id: 13, estado: 1 });
    expect(component.columnas.some(e => e.id === 1)).toBeTrue();
    expect(component.solicitudesPorEstado(1).length).toBe(1);
    component.nuevo();
    expect(component.formulario.estado).toBe(5);
  });

  it('mantiene las columnas estándar si el usuario no puede consultar el catálogo', () => {
    estados.obtenerEstados.and.returnValue(throwError(() => new Error('Sin permiso')));
    component.ngOnInit();
    expect(component.estados.map(e => e.id)).toEqual([5, 6, 7, 8]);
    expect(component.mantenimientos.length).toBe(1);
  });

  it('ignora objetos arrastrados desde fuera y limpia el destino al cancelar', () => {
    const evento = new DragEvent('drop', { cancelable: true });
    component.soltar(evento, 6);
    expect(service.cambiarEstado).not.toHaveBeenCalled();
    component.iniciarArrastre(new DragEvent('dragstart'), solicitud);
    component.permitirSoltar(new DragEvent('dragover', { cancelable: true }), 6);
    expect(component.columnaDestino).toBe(6);
    component.cancelar();
    expect(component.arrastrandoId).toBeNull();
    expect(component.columnaDestino).toBeNull();
  });

  it('no abre formularios durante un movimiento pendiente', () => {
    component.moverSolicitud(11, 6);
    component.editar(solicitud);
    component.nuevo();
    expect(component.formularioAbierto).toBeFalse();
  });

  describe('formulario de creación y edición', () => {
    it('crea con una propiedad elegida y envía la descripción limpia sin identidad', () => {
      service.crear.and.returnValue(of({ success: true, data: solicitud }));
      component.nuevo();
      expect(component.propiedades[0].nombre).toBe('Casa de prueba');
      expect(component.formulario.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      component.formulario = { propiedadID: 2, descripcion: '  Reparar la llave  ',
        fecha: '2026-11-21', costo: 1800.25, estado: 5 };
      component.guardar();
      expect(service.crear).toHaveBeenCalledOnceWith({ propiedadID: 2,
        descripcion: 'Reparar la llave', fecha: '2026-11-21', costo: 1800.25, estado: 5 });
      expect(component.formularioAbierto).toBeFalse();
    });

    it('permite conservar la propiedad no disponible y el estado anterior al editar', () => {
      const anterior = { ...solicitud, propiedadID: 99, estado: 1 };
      component.mantenimientos = [anterior];
      service.actualizar.and.returnValue(of({ success: true, data: anterior }));
      component.editar(anterior);
      expect(component.propiedadNoDisponible).toBeTrue();
      component.formulario.descripcion = 'Trabajo actualizado';
      component.guardar();
      expect(service.actualizar).toHaveBeenCalledWith(11, jasmine.objectContaining({
        propiedadID: 99, estado: 1, descripcion: 'Trabajo actualizado'
      }));
      expect(service.actualizar.calls.mostRecent().args[1]).not.toEqual(jasmine.objectContaining({ id: 11 }));
      expect(anterior.descripcion).toBe(solicitud.descripcion);
    });

    it('rechaza propiedades inventadas, fechas inexistentes y costos inválidos', () => {
      component.nuevo();
      component.formulario = { propiedadID: 999, descripcion: ' ', fecha: '2026-02-31',
        costo: -1, estado: 999 };
      component.guardar();
      expect(Object.keys(component.erroresCampos).length).toBe(5);
      expect(service.crear).not.toHaveBeenCalled();
      component.formulario = { propiedadID: 2, descripcion: 'Reparar', fecha: '2026-11-21',
        costo: 10.123, estado: 5 };
      component.guardar();
      expect(component.erroresCampos.costo).toContain('dos decimales');
      expect(service.crear).not.toHaveBeenCalled();
    });

    it('bloquea guardados y cierre duplicados y conserva los datos tras un error', () => {
      const guardado = new Subject<ApiResponse<Mantenimiento>>();
      service.crear.and.returnValue(guardado);
      component.nuevo();
      component.formulario = { propiedadID: 2, descripcion: 'Reparar', fecha: '2026-11-21', costo: 0, estado: 5 };
      component.guardar();
      component.guardar();
      component.cancelar();
      expect(service.crear).toHaveBeenCalledTimes(1);
      expect(component.formularioAbierto).toBeTrue();
      guardado.error(new Error('Sin conexión'));
      expect(component.formulario.descripcion).toBe('Reparar');
      expect(component.guardando).toBeFalse();
      expect(component.errorFormulario).toContain('No se pudo guardar');
    });

    it('permite reintentar la carga y descarta respuestas después de cerrar', () => {
      propiedades.obtenerPropiedades.and.returnValue(throwError(() => new Error('Sin conexión')));
      component.nuevo();
      expect(component.errorPropiedades).toContain('No se pudieron cargar');
      const carga = new Subject<any>();
      propiedades.obtenerPropiedades.and.returnValue(carga);
      component.cargarPropiedades();
      expect(component.cargandoPropiedades).toBeTrue();
      component.cancelar();
      carga.next({ success: true, data: [{ id: 99 }] });
      expect(component.propiedades.length).toBe(0);
      expect(component.formularioAbierto).toBeFalse();
    });
  });

  describe('interacciones en pantalla', () => {
    let fixture: ComponentFixture<Mantenimientos>;
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [Mantenimientos],
        providers: [
          provideZonelessChangeDetection(),
          { provide: MantenimientosService, useValue: service },
          { provide: AuthService, useValue: auth },
          { provide: EstadosService, useValue: estados },
          { provide: PropiedadesService, useValue: propiedades }
        ]
      }).compileComponents();
      fixture = TestBed.createComponent(Mantenimientos);
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('permite arrastrar a una columna vacía y mantiene el tablero visible ante un fallo', () => {
      const tarjeta = fixture.nativeElement.querySelector('.maintenance-ticket') as HTMLElement;
      const destino = fixture.nativeElement.querySelector('[data-state="6"]') as HTMLElement;
      expect(tarjeta.draggable).toBeTrue();
      tarjeta.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: new DataTransfer() }));
      destino.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true }));
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      expect(destino.classList.contains('drop-target')).toBeTrue();
      destino.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true }));
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      expect(destino.querySelectorAll('.maintenance-ticket').length).toBe(1);
      respuesta.error(new Error('Sin conexión'));
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.maintenance-board')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('[data-state="5"] .maintenance-ticket')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Se restauró');
    });

    it('ofrece el selector para mover una tarjeta sin arrastrar', async () => {
      const selector = fixture.nativeElement.querySelector('.ticket-state-select') as HTMLSelectElement;
      selector.selectedIndex = 2;
      selector.dispatchEvent(new Event('change'));
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      expect(service.cambiarEstado).toHaveBeenCalledOnceWith(11, 7);
      await fixture.whenStable();
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-state="7"] .ticket-state-select').disabled).toBeTrue();
    });

    it('conserva la columna y el selector de un estado antiguo entre repintados', () => {
      fixture.componentInstance.mantenimientos = [{ ...solicitud, estado: 1 }];
      try {
        fixture.changeDetectorRef.markForCheck();
        fixture.detectChanges();
        const columna = fixture.nativeElement.querySelector('[data-state="1"]');
        const selector = columna.querySelector('.ticket-state-select');
        for (let i = 0; i < 4; i++) {
          fixture.changeDetectorRef.markForCheck();
          fixture.detectChanges();
        }
        expect(fixture.nativeElement.querySelector('[data-state="1"]')).toBe(columna);
        expect(fixture.nativeElement.querySelector('[data-state="1"] .ticket-state-select')).toBe(selector);
      } finally {
        fixture.destroy();
      }
    });

    it('estabiliza también las opciones del formulario con estados antiguos', async () => {
      const antigua = { ...solicitud, estado: 1 };
      fixture.componentInstance.mantenimientos = [antigua];
      fixture.componentInstance.editar(antigua);
      try {
        fixture.changeDetectorRef.markForCheck();
        fixture.detectChanges();
        await fixture.whenStable();
        const selector = fixture.nativeElement.querySelector('select[name="estado"]');
        const opcion = selector.options[selector.options.length - 1];
        for (let i = 0; i < 4; i++) {
          fixture.changeDetectorRef.markForCheck();
          fixture.detectChanges();
        }
        await fixture.whenStable();
        expect(selector.options[selector.options.length - 1]).toBe(opcion);
        expect(fixture.componentInstance.formulario.estado).toBe(1);
      } finally {
        fixture.destroy();
      }
    });

    it('se estabiliza al recibir datos asíncronos con estado antiguo y al recargar el catálogo', async () => {
      const solicitudes = new Subject<ApiResponse<Mantenimiento[]>>();
      service.obtenerMantenimientos.and.returnValue(solicitudes);
      const instance = fixture.componentInstance;
      instance.ngOnInit();
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      const errores = spyOn(TestBed.inject(ErrorHandler), 'handleError').and.callThrough();
      solicitudes.next({ success: true, data: [{ ...solicitud, estado: 1 }] });
      solicitudes.complete();
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      await fixture.whenStable();
      const columnas = instance.columnas;
      const selector = fixture.nativeElement.querySelector('[data-state="1"] select');
      expect(selector.value).toBe('1');
      for (let i = 0; i < 20; i++) {
        instance.estados = instance.estados.map(e => ({ ...e }));
        fixture.changeDetectorRef.markForCheck();
        fixture.detectChanges();
        expect(instance.columnas).toBe(columnas);
        expect(fixture.nativeElement.querySelector('[data-state="1"] select')).toBe(selector);
      }
      await fixture.whenStable();
      expect(errores).not.toHaveBeenCalled();
      expect(service.obtenerMantenimientos).toHaveBeenCalledTimes(3);
    });

    it('presenta propiedad y descripción y mantiene el foco durante el guardado', async () => {
      fixture.componentInstance.nuevo();
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      await fixture.whenStable();
      const dialogo = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
      expect(dialogo.querySelector('textarea[name="descripcion"]')).not.toBeNull();
      expect(dialogo.querySelector('select[name="propiedad"]')?.textContent).toContain('Casa de prueba');
      expect(document.activeElement?.id).toBe('maintenance-modal-title');
      fixture.componentInstance.guardando = true;
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
      document.dispatchEvent(tab);
      expect(tab.defaultPrevented).toBeTrue();
      expect(document.activeElement?.id).toBe('maintenance-modal-title');
    });

    it('presenta solo consulta cuando falta el permiso de gestión', () => {
      auth.hasPermission.and.returnValue(false);
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.maintenance-ticket').draggable).toBeFalse();
      expect(fixture.nativeElement.querySelector('.ticket-state-select')).toBeNull();
      expect(fixture.nativeElement.querySelector('.action-buttons')).toBeNull();
    });
  });
});
