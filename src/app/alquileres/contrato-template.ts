import { Propietario } from '../propietarios.service';
import { Garante } from '../alquileres.service';

export interface DatosPlantillaContrato {
  numero: number | string;
  propiedad: string;
  inquilino: string;
  direccionInquilino?: string;
  cedulaInquilino?: string;
  nacionalidadInquilino?: string;
  mayorEdadInquilino?: boolean;
  propietario?: Pick<Propietario, 'nombreCompleto' | 'cedula' | 'nacionalidad' | 'direccion' | 'mayorEdad'>;
  fechaInicio: string;
  fechaFin: string;
  montoMensual: number | null;
  diaPago?: number | null;
  cantidadDepositos?: number | null;
  montoTotalDepositos?: number | null;
  lugarFirma?: string | null;
  fechaFirma?: string | null;
  garantes: Garante[];
}

const escapar = (texto: string): string => texto.replace(/[&<>"']/g, caracter => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[caracter]!));
const campo = (nombre: string): string => `<mark class="campo">[${nombre}]</mark>`;
const valor = (texto: string | undefined, nombre: string): string =>
  texto?.trim() ? escapar(texto.trim()) : campo(nombre);
const moneda = (numero: number): string => new Intl.NumberFormat('es-DO', {
  style: 'currency', currency: 'DOP', currencyDisplay: 'code', minimumFractionDigits: 2
}).format(numero).replace('DOP', 'RD$');
const fecha = (texto: string): string => {
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(texto);
  if (!partes) return campo('FECHA');
  const [, anio, mes, dia] = partes;
  return `${Number(dia)} de ${['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][Number(mes) - 1]} de ${anio}`;
};

// Plantilla de la aplicación basada en el documento de referencia.
// Los datos personales se insertan como texto escapado y nunca se fijan en la plantilla.
export function contenidoContrato(datos: DatosPlantillaContrato): string {
  const propietario = valor(datos.propietario?.nombreCompleto, 'NOMBRE COMPLETO DEL PROPIETARIO');
  const inquilino = valor(datos.inquilino, 'NOMBRE COMPLETO DEL INQUILINO');
  const renta = datos.montoMensual === null ? campo('MONTO MENSUAL') : escapar(moneda(datos.montoMensual));
  const cantidad = datos.cantidadDepositos;
  const depositos = cantidad === null || cantidad === undefined ? campo('CANTIDAD DE DEPÓSITOS') : String(cantidad);
  const totalDepositos = datos.montoTotalDepositos !== null && datos.montoTotalDepositos !== undefined
    ? escapar(moneda(datos.montoTotalDepositos)) : cantidad !== null && cantidad !== undefined && datos.montoMensual !== null
    ? escapar(moneda(cantidad * datos.montoMensual)) : campo('MONTO TOTAL DE LOS DEPÓSITOS');
  const firma = (nombre: string, rol: string) => `<div class="firma"><span>${nombre}</span><small>${rol}</small></div>`;
  return `
    <aside class="herramientas">
      <button type="button" id="imprimir-contrato">Imprimir / Guardar como PDF</button>
      <p>Puedes editar el texto del contrato. Completa los campos resaltados y revisa las condiciones antes de imprimir. Los cambios de esta vista no se guardan en el sistema.</p>
      <p>Formato de impresión: papel Legal (8.5 × 14 pulgadas), escala 100 %, sin encabezados ni pies del navegador.</p>
    </aside>
    <article class="contrato" contenteditable="true" spellcheck="false" aria-label="Contrato editable">
      <h1>CONTRATO DE ALQUILER</h1>
      <p><strong>ENTRE:</strong> De una parte, ${propietario}, de nacionalidad ${valor(datos.propietario?.nacionalidad, 'NACIONALIDAD DEL PROPIETARIO')}, ${datos.propietario?.mayorEdad ? 'mayor de edad' : campo('CONFIRMAR MAYORÍA DE EDAD DEL PROPIETARIO')}, provisto de la Cédula de Identidad y Electoral No. ${valor(datos.propietario?.cedula, 'CÉDULA DEL PROPIETARIO')}, domiciliado y residente en ${valor(datos.propietario?.direccion, 'DOMICILIO DEL PROPIETARIO')}, quien en lo adelante se denominará <strong>EL PROPIETARIO</strong>; y de la otra parte, <strong>${inquilino}</strong>, de nacionalidad ${valor(datos.nacionalidadInquilino, 'NACIONALIDAD DEL INQUILINO')}, ${datos.mayorEdadInquilino ? 'mayor de edad' : campo('CONFIRMAR MAYORÍA DE EDAD DEL INQUILINO')}, portador de la Cédula de Identidad y Electoral No. ${valor(datos.cedulaInquilino, 'CÉDULA DEL INQUILINO')}, domiciliado y residente en ${valor(datos.direccionInquilino, 'DOMICILIO DEL INQUILINO')}, quien en lo adelante se denominará <strong>EL INQUILINO</strong>.</p>
      <h2>SE HA CONVENIDO Y PACTADO LO SIGUIENTE:</h2>
      <p><strong>PRIMERO:</strong> <strong>EL PROPIETARIO</strong> otorga en alquiler real y efectivamente a <strong>EL INQUILINO</strong>, bajo las condiciones que se indicarán más adelante, el inmueble identificado como <strong>${valor(datos.propiedad, 'DESCRIPCIÓN Y DIRECCIÓN DEL INMUEBLE')}</strong>, con todas sus dependencias y anexidades, para ser usado exclusivamente como vivienda familiar, única y exclusivamente. No podrá darle otro uso que el especificado, ni cederlo ni subalquilarlo en todo ni en parte sin el consentimiento escrito de <strong>EL PROPIETARIO</strong>; tampoco podrá cederlo gratuitamente ni admitir por favor o tolerancia que ningún tercero lo ocupe, aun fuere pariente.</p>
      <p><strong>SEGUNDO:</strong> <strong>EL INQUILINO</strong> queda obligado a mantener el referido inmueble en buen estado. Los desperfectos en paredes, pisos, puertas, ventanas, cristales, pestillos, cerraduras, instalación eléctrica e instalación sanitaria, incluyendo obstrucciones de inodoros, lavamanos, baños, fregaderos y cualquier otro desagüe, así como cambios de zapatillas y rotura de llaves, serán reparados o repuestos a su solo costo. También queda a cargo de <strong>EL INQUILINO</strong> la pintura interior del inmueble alquilado.</p>
      <p><strong>TERCERO:</strong> <strong>EL INQUILINO</strong> se compromete a no hacer ningún cambio o distribución nueva en el inmueble sin la previa autorización por escrito de <strong>EL PROPIETARIO</strong>. En caso de obtenida esta, las mejoras hechas en la vivienda, incluyendo las instalaciones que se realicen, con todo su material, quedarán a beneficio de <strong>EL PROPIETARIO</strong>, sin compensación de ninguna especie.</p>
      <p><strong>CUARTO:</strong> <strong>EL INQUILINO</strong> se obliga a pagar por concepto de alquiler mensual la suma de <strong>${renta}</strong>, en moneda de curso legal, mes por mes y sin retardo alguno, el día <strong>${datos.diaPago ? String(datos.diaPago) : campo('DÍA DE PAGO')}</strong> de cada mes. A partir de la fecha de pago, en caso de atraso en el pago de las mensualidades, se cobrará un <strong>cinco por ciento (5 %)</strong> por concepto de mora sobre las mensualidades vencidas y dejadas de pagar.</p>
      <p><strong>QUINTO:</strong> Este contrato tendrá vigencia desde el <strong>${fecha(datos.fechaInicio)}</strong> hasta el <strong>${fecha(datos.fechaFin)}</strong>. En caso de renovación, el mismo tendrá un aumento de un <strong>diez por ciento (10 %)</strong>, automáticamente.</p>
      <p><strong>Párrafo:</strong> Queda entendido que el presente contrato concede <strong>cinco (5) días de gracia</strong> a <strong>EL INQUILINO</strong> para los mantenimientos requeridos antes de alojarse en el inmueble; después de dicho plazo, el contrato seguirá su curso.</p>
      <p><strong>SEXTO:</strong> <strong>EL INQUILINO</strong> entrega en calidad de <strong>${depositos}</strong> depósito(s) la suma total de <strong>${totalDepositos}</strong>, en moneda de curso legal, que <strong>EL PROPIETARIO</strong> declara haber recibido. Esta suma responderá y podrá aplicarse a los gastos ocasionados por cualquier acción legal derivada del incumplimiento de las obligaciones de <strong>EL INQUILINO</strong>, a los gastos que ocasione el desalojo y a las reparaciones previstas en la cláusula segunda que no hayan sido hechas y pagadas por <strong>EL INQUILINO</strong>.</p>
      <p><strong>SÉPTIMO:</strong> Queda claramente establecido que los servicios de teléfono, luz y cualesquiera otros servicios estarán a cargo de <strong>EL INQUILINO</strong>, quedando entendido que al momento de la firma del presente contrato no presentan atraso. El mantenimiento del inmueble correrá por cuenta de <strong>EL INQUILINO</strong>, conjuntamente con la cuota de la mensualidad. Para todo lo no previsto, las partes se remiten al derecho común.</p>
      ${datos.garantes.length ? `<section class="garantes"><p><strong>GARANTES:</strong> Intervienen en calidad de garantes del presente contrato las siguientes personas:</p><ol>${datos.garantes.map(g => `<li><strong>${escapar(g.nombre_completo)}</strong>, cédula de identidad No. <strong>${escapar(g.cedula)}</strong>.</li>`).join('')}</ol></section>` : ''}
      <p><strong>HECHO Y FIRMADO</strong> en ${valor(datos.lugarFirma ?? undefined, 'CIUDAD Y PROVINCIA DE FIRMA')}, República Dominicana, el ${datos.fechaFirma ? fecha(datos.fechaFirma) : campo('FECHA DE FIRMA')}.</p>
      <section class="firmas">
        ${firma(propietario, 'Propietario')}
        ${firma(inquilino, 'Inquilino')}
        ${datos.garantes.map((g, i) => firma(escapar(g.nombre_completo), `Garante ${i + 1}`)).join('')}
      </section>
      <section class="notaria">
        <h2>CERTIFICACIÓN NOTARIAL</h2>
        <p class="nota-notaria">Espacio reservado para completar por el notario actuante al presenciar las firmas.</p>
        <p>YO, ${campo('NOMBRE DEL NOTARIO')}, Abogado Notario Público de los del Número de ${campo('JURISDICCIÓN')}, matrícula No. ${campo('MATRÍCULA')}, <strong>CERTIFICO Y DOY FE</strong> que las firmas que aparecen estampadas en el presente documento han sido puestas en mi presencia, libre y voluntariamente, por ${campo('NOMBRES DE TODOS LOS COMPARECIENTES')}, quienes me han declarado bajo la fe del juramento que estas son las firmas que acostumbran usar en todos los actos de sus vidas. En ${campo('LUGAR')}, República Dominicana, a los ${campo('FECHA DE CERTIFICACIÓN')}.</p>
        <div class="firma firma-notario"><span>${campo('NOMBRE DEL NOTARIO')}</span><small>Notario Público</small></div>
      </section>
    </article>`;
}

export const estilosContrato = `
  *{box-sizing:border-box}body{margin:0;background:#e8ebef;color:#111;font:10.5pt/1.18 Arial,sans-serif}
  .herramientas{max-width:850px;margin:20px auto;padding:16px;background:white;border:1px solid #ccd2db;border-radius:8px;font:14px/1.45 Arial,sans-serif}
  .herramientas p{margin:8px 0 0}button{padding:10px 18px;background:#087fae;color:white;border:0;border-radius:5px;cursor:pointer}
  .contrato{width:8.5in;min-height:14in;margin:20px auto;padding:12mm 14mm;background:white;border-left:3px double #a45353;border-right:3px double #a45353;outline:none}
  h1{text-align:center;text-decoration:underline;font-size:12pt;margin:0 0 8pt}h2{text-align:center;font-size:10.5pt;margin:8pt 0}
  p{text-align:justify;margin:0 0 7pt;overflow-wrap:anywhere}ol{padding-left:22px;margin:4pt 0 8pt}li{margin:4pt 0}
  .campo{background:#fff0ba;color:inherit;padding:0 2px}.firmas{display:flex;flex-wrap:wrap;gap:30pt 24pt;margin:40pt 0 16pt}
  .firma{flex:1 1 40%;text-align:center;break-inside:avoid;page-break-inside:avoid}.firma span{display:block;border-top:1px solid;padding-top:5pt;font-weight:bold}.firma small{display:block;font-size:10pt}
  .notaria{margin-top:14pt;break-inside:avoid;page-break-inside:avoid}.nota-notaria{font-size:9pt;font-style:italic}.firma-notario{max-width:80%;margin:36pt auto 0}
  @page{size:legal;margin:14mm 16mm}
  @media print{body{background:white}.herramientas{display:none}.contrato{width:auto;min-height:0;margin:0;padding:0 5mm;border-color:#a45353}.campo{background:none}h1,h2{break-after:avoid}p{orphans:3;widows:3}}
  @media screen and (max-width:850px){.contrato{width:100%;min-height:0;margin:10px 0;padding:20px}.herramientas{margin:10px}}
`;
