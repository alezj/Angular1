import { contenidoContrato, DatosPlantillaContrato } from './contrato-template';

describe('Plantilla del contrato de referencia', () => {
  const datos: DatosPlantillaContrato = {
    numero: 25, propiedad: 'Casa de prueba · Calle Ejemplo 10', inquilino: 'Persona de prueba',
    fechaInicio: '2026-11-01', fechaFin: '2027-10-31', montoMensual: 15000,
    diaPago: 15, cantidadDepositos: 2, garantes: []
  };

  it('completa fechas, renta, día de pago y total de depósitos con los datos del contrato', () => {
    const html = contenidoContrato(datos);
    expect(html).toContain('1 de noviembre de 2026');
    expect(html).toContain('31 de octubre de 2027');
    expect(html).toContain('15,000.00');
    expect(html).toContain('30,000.00');
    expect(html).toContain('<strong>15</strong>');
    expect(html).toContain('SÉPTIMO:');
  });

  it('deja campos para los datos faltantes sin reutilizar identidades de la fotografía', () => {
    const html = contenidoContrato({ ...datos, cantidadDepositos: undefined, montoMensual: null });
    expect(html).toContain('[NOMBRE COMPLETO DEL PROPIETARIO]');
    expect(html).toContain('[CÉDULA DEL INQUILINO]');
    expect(html).toContain('[MONTO TOTAL DE LOS DEPÓSITOS]');
    expect(html).not.toContain('JOHANCEL');
    expect(html).not.toContain('MARGARITA');
    expect(html).not.toContain('<img');
  });

  it('escapa nombres, dirección y garantes antes de insertarlos en el documento', () => {
    const html = contenidoContrato({ ...datos, inquilino: '<script>alert(1)</script>',
      propiedad: '<img src=x>', garantes: [{ cedula: '001<2', nombre_completo: '<svg onload=alert(1)>' }] });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<svg');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('001&lt;2');
  });

  it('permite revisar el texto antes de imprimir y reserva la certificación para el notario', () => {
    const html = contenidoContrato(datos);
    expect(html).toContain('contenteditable="true"');
    expect(html).toContain('Espacio reservado para completar por el notario');
    expect(html).not.toContain('class="garantes"');
  });
  it('completa las identidades registradas de propietario e inquilino sin marcadores', () => {
    const html = contenidoContrato({ ...datos,
      propietario: { nombreCompleto: 'Dueño de prueba', cedula: 'P-001', nacionalidad: 'Dominicana', direccion: 'Domicilio propietario', mayorEdad: true },
      cedulaInquilino: 'I-001', nacionalidadInquilino: 'Dominicana', direccionInquilino: 'Domicilio inquilino', mayorEdadInquilino: true
    });
    expect(html).toContain('Dueño de prueba');
    expect(html).toContain('P-001');
    expect(html).toContain('I-001');
    expect(html).toContain('Domicilio propietario');
    expect(html).not.toContain('[CÉDULA DEL INQUILINO]');
    expect(html).not.toContain('[NOMBRE COMPLETO DEL PROPIETARIO]');
    expect(html).not.toContain('[CONFIRMAR MAYORÍA');
  });

});
