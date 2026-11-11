import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Inquilino, InquilinosService } from '../inquilinos.service';

@Component({
  selector: 'app-inquilinos',
  imports: [CommonModule, DatePipe, FormsModule],
  templateUrl: './inquilinos.html',
  styleUrl: './inquilinos.css'
})
export class Inquilinos implements OnInit {

  // Signals
  inquilinos = signal<Inquilino[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);
  editandoId = signal<number | null>(null);
  formularioAbierto = signal(false);
  searchTerm = signal('');
  guardando = signal(false);
  errorFormulario = signal<string | null>(null);

  formulario: Omit<Inquilino, 'id'> = {
    nombreApellido: '',
    cedula: '', nacionalidad: '', direccion: '', mayorEdad: false,
    correo: '',
    fechaInicioContrato: '',
    fechaPagos: 1
  };

  // Computed
  filteredInquilinos = computed(() => {

    const term = this.searchTerm().toLowerCase().trim();
    const lista = this.inquilinos();

    if (!term) {
      return lista;
    }

    return lista.filter((inquilino) =>
      `${inquilino.nombreApellido}
       ${inquilino.cedula} ${inquilino.nacionalidad} ${inquilino.direccion} ${inquilino.correo}
       ${inquilino.telefono}
       ${inquilino.fechaInicioContrato}
       ${inquilino.fechaPagos}`
        .toLowerCase()
        .includes(term)
    );
  });

  constructor(
    private readonly inquilinosService: InquilinosService
  ) {}

  ngOnInit(): void {

    this.cargando.set(true);
    this.error.set(null);

    this.inquilinosService.obtenerInquilinos().subscribe({

      next: (respuesta) => {

        if (respuesta.success) {
          this.inquilinos.set(respuesta.data);
        } else {
          this.error.set(
            'La API no pudo obtener los inquilinos.'
          );
        }

        this.cargando.set(false);
      },

      error: () => {

        this.error.set(
          'No se pudo conectar con el backend.'
        );

        this.cargando.set(false);
      }

    });
  }

  guardar(): void {
    if (this.guardando()) return;
    const f = this.formulario;
    if (!f.nombreApellido.trim() || !f.cedula?.trim() || !f.nacionalidad?.trim()
      || !f.direccion?.trim() || !f.mayorEdad || !f.fechaInicioContrato
      || !Number.isInteger(f.fechaPagos) || f.fechaPagos < 1 || f.fechaPagos > 31) {
      this.errorFormulario.set('Completa los datos de identidad, domicilio, mayoría de edad y un día de pago entre 1 y 31.');
      return;
    }
    this.guardando.set(true);
    this.errorFormulario.set(null);
    this.formulario = { ...f, nombreApellido: f.nombreApellido.trim(), cedula: f.cedula.trim(),
      nacionalidad: f.nacionalidad.trim(), direccion: f.direccion.trim() };

    const r =
      this.editandoId() === null
        ? this.inquilinosService.crear(this.formulario)
        : this.inquilinosService.actualizar(
            this.editandoId()!,
            this.formulario
          );

    r.subscribe({

      next: () => {
        this.guardando.set(false);
        this.cancelar();
        this.ngOnInit();
      },

      error: () => {
        this.guardando.set(false);
        this.errorFormulario.set('No se pudo guardar el inquilino. Intenta nuevamente.');
      }

    });
  }

  editar(x: Inquilino): void {

    this.editandoId.set(x.id);
    this.errorFormulario.set(null);

    this.formulario = {
      nombreApellido: x.nombreApellido,
      cedula: x.cedula ?? '', nacionalidad: x.nacionalidad ?? '',
      direccion: x.direccion ?? '', mayorEdad: x.mayorEdad ?? false,
      correo: x.correo ?? x.email ?? '',
      telefono: x.telefono,
      fechaInicioContrato:
        (x.fechaInicioContrato || '').substring(0, 10),
      fechaPagos: x.fechaPagos
    };
    this.formularioAbierto.set(true);
  }

  nuevo(): void {
    this.cancelar();
    this.formularioAbierto.set(true);
  }

  eliminar(id: number): void {

    if (confirm('¿Eliminar este inquilino?')) {

      this.inquilinosService.eliminar(id).subscribe({

        next: () => this.ngOnInit(),

        error: () => {
          this.error.set('No se pudo eliminar.');
        }

      });
    }
  }

  cancelar(): void {
    if (this.guardando()) return;
    this.errorFormulario.set(null);

    this.editandoId.set(null);
    this.formularioAbierto.set(false);

    this.formulario = {
      nombreApellido: '',
      cedula: '', nacionalidad: '', direccion: '', mayorEdad: false,
      correo: '',
      telefono: '',
      fechaInicioContrato: '',
      fechaPagos: 1
    };
  }
}
