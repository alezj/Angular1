import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Inicio } from './inicio';
import { InquilinosService } from '../inquilinos.service';
import { PropiedadesService } from '../propiedades.service';

describe('Inicio', () => {
  let component: Inicio;
  let fixture: ComponentFixture<Inicio>;

  beforeEach(async () => {
    const propiedadesService = jasmine.createSpyObj('PropiedadesService', ['obtenerPropiedades']);
    const inquilinosService = jasmine.createSpyObj('InquilinosService', ['obtenerInquilinos']);

    propiedadesService.obtenerPropiedades.and.returnValue(of({
      success: true,
      data: [
        { id: 1, nombre: 'Casa A', direccion: 'Calle 1', estado: 1, precioMensual: 1000, notas: '' },
        { id: 2, nombre: 'Casa B', direccion: 'Calle 2', estado: 2, precioMensual: 1200, notas: '' }
      ]
    }));

    inquilinosService.obtenerInquilinos.and.returnValue(of({
      success: true,
      data: [
        { id: 1, nombreApellido: 'Ana Pérez', fechaInicioContrato: '2024-01-01', fechaPagos: 1 },
        { id: 2, nombreApellido: 'Luis Gómez', fechaInicioContrato: '2024-02-01', fechaPagos: 15 }
      ]
    }));

    await TestBed.configureTestingModule({
      imports: [Inicio],
      providers: [
        { provide: PropiedadesService, useValue: propiedadesService },
        { provide: InquilinosService, useValue: inquilinosService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Inicio);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the dashboard summary counts', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Propiedades disponibles');
    expect(compiled.textContent).toContain('1');
    expect(compiled.textContent).toContain('Propiedades ocupadas');
    expect(compiled.textContent).toContain('Inquilinos');
  });
});
