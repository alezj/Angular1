import { of, throwError } from 'rxjs';
import { Notarios } from './notarios';
import { Notario, NotariosService } from '../notarios.service';
import { AuthService } from '../auth/auth.service';

describe('Mantenimiento de notarios', () => {
  const notario: Notario = { id: 1, nombreCompleto: 'Notario de prueba', cedula: 'N-1',
    matricula: '1234', jurisdiccion: 'Santiago', direccion: 'Calle de prueba' };
  let component: Notarios;
  let service: jasmine.SpyObj<NotariosService>;
  beforeEach(() => {
    service = jasmine.createSpyObj('NotariosService', ['obtenerNotarios', 'crear', 'actualizar', 'eliminar']);
    service.obtenerNotarios.and.returnValue(of({ success: true, data: [notario] }));
    service.crear.and.returnValue(of({ success: true, data: notario }));
    service.actualizar.and.returnValue(of({ success: true, data: notario }));
    component = new Notarios(service, { hasPermission: () => true } as unknown as AuthService);
  });
  it('exige los datos de identidad y acreditación y conserva el formulario ante duplicados', () => {
    component.nuevo();
    component.formulario = { ...notario, matricula: ' ' };
    component.guardar();
    expect(service.crear).not.toHaveBeenCalled();
    component.formulario.matricula = '1234';
    service.crear.and.returnValue(throwError(() => ({ code: '23505' })));
    component.guardar();
    expect(component.formularioAbierto()).toBeTrue();
    expect(component.guardando()).toBeFalse();
    expect(component.errorFormulario()).toContain('cédula o matrícula');
  });
  it('filtra por matrícula y jurisdicción y edita sin modificar el registro original', () => {
    component.ngOnInit();
    component.searchTerm.set('1234');
    expect(component.filtrados().length).toBe(1);
    component.searchTerm.set('santiago');
    expect(component.filtrados().length).toBe(1);
    component.editar(notario);
    component.formulario.jurisdiccion = 'Otra jurisdicción';
    component.guardar();
    expect(service.actualizar).toHaveBeenCalledWith(1, jasmine.objectContaining({ jurisdiccion: 'Otra jurisdicción' }));
    expect(notario.jurisdiccion).toBe('Santiago');
  });
  it('explica por qué un notario con contratos no se puede eliminar', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    service.eliminar.and.returnValue(throwError(() => ({ code: '23503' })));
    component.eliminar(notario);
    expect(component.error()).toContain('contratos asociados');
  });
  it('no guarda si el usuario carece de permiso', () => {
    spyOn(component.auth, 'hasPermission').and.returnValue(false);
    component.formulario = { ...notario };
    component.guardar();
    expect(service.crear).not.toHaveBeenCalled();
  });
});
