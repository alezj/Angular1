import { of, throwError } from 'rxjs';
import { Propietarios } from './propietarios';
import { Propietario, PropietariosService } from '../propietarios.service';
import { AuthService } from '../auth/auth.service';

describe('Mantenimiento de propietarios', () => {
  let component: Propietarios;
  let service: jasmine.SpyObj<PropietariosService>;
  const persona: Propietario = { id: 10, nombreCompleto: 'Dueño prueba', cedula: 'P-01', nacionalidad: 'Dominicana', direccion: 'Domicilio prueba', mayorEdad: true, telefono: '555', correo: 'prueba@example.com' };
  beforeEach(() => {
    service = jasmine.createSpyObj('PropietariosService', ['crear', 'actualizar', 'eliminar', 'obtenerPropietarios']);
    service.obtenerPropietarios.and.returnValue(of({ success: true, data: [persona] }));
    service.crear.and.returnValue(of({ success: true, data: persona }));
    service.actualizar.and.returnValue(of({ success: true, data: persona }));
    component = new Propietarios(service, {} as AuthService);
  });
  it('crea con los datos de identidad y contacto completos', () => {
    component.nuevo(); component.formulario = { ...persona }; component.guardar();
    expect(service.crear).toHaveBeenCalled();
    expect(component.formularioAbierto()).toBeFalse();
  });
  it('conserva datos de contacto y no manda identidad de la fila al editar', () => {
    component.editar(persona); component.formulario.direccion = 'Nuevo domicilio'; component.guardar();
    const datos = service.actualizar.calls.mostRecent().args[1];
    expect(datos.correo).toBe(persona.correo);
    expect(datos.telefono).toBe('555');
    expect(datos.direccion).toBe('Nuevo domicilio');
    expect('id' in datos).toBeFalse();
  });
  it('exige mayoría de edad y mantiene abierto el formulario ante una cédula duplicada', () => {
    component.editar(persona); component.formulario.mayorEdad = false; component.guardar();
    expect(service.actualizar).not.toHaveBeenCalled();
    component.formulario.mayorEdad = true;
    service.actualizar.and.returnValue(throwError(() => ({ code: '23505' })));
    component.guardar();
    expect(component.errorFormulario()).toContain('cédula');
    expect(component.formularioAbierto()).toBeTrue();
  });
});
