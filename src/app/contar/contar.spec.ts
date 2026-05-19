import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Contar } from './contar';

describe('Contar', () => {
  let component: Contar;
  let fixture: ComponentFixture<Contar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Contar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Contar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
