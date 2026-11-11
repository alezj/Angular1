import { of } from 'rxjs';
import { Inquilinos } from './inquilinos';
import { Inquilino, InquilinosService } from '../inquilinos.service';

describe('Datos contractuales del inquilino', () => {
  const persona: Inquilino = { id: 5, nombreApellido: 'Inquilino prueba', cedula: 'I-01', nacionalidad: 'Dominicana', mayorEdad: true, direccion: 'Calle de prueba', telefono: '555', correo: 'prueba@example.com', fechaInicioContrato: '2026-01-01', fechaPagos: 15 };
  let component: Inquilinos;
  let service: jasmine.SpyObj<InquilinosService>;
  beforeEach(() => {
    service = jasmine.createSpyObj('InquilinosService', ['actualizar', 'obtenerInquilinos']);
    service.obtenerInquilinos.and.returnValue(of({ success: true, data: [persona] }));
    service.actualizar.and.returnValue(of({ success: true, data: persona }));
    component = new Inquilinos(service);
  });
  it('edita identidad sin perder los campos previos de contacto y pago', () => {
    component.editar(persona); component.formulario.nacionalidad = 'Otra nacionalidad'; component.guardar();
    expect(service.actualizar).toHaveBeenCalledWith(5, jasmine.objectContaining({
      nacionalidad: 'Otra nacionalidad', cedula: 'I-01', direccion: 'Calle de prueba', telefono: '555', correo: 'prueba@example.com', fechaPagos: 15
    }));
  });
  it('solicita completar los nuevos datos en registros antiguos', () => {
    component.editar({ ...persona, cedula: undefined, mayorEdad: undefined }); component.guardar();
    expect(service.actualizar).not.toHaveBeenCalled();
    expect(component.errorFormulario()).toBeTruthy();
  });
});
