import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Custome } from './custome';

describe('Custome', () => {
  let component: Custome;
  let fixture: ComponentFixture<Custome>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Custome]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Custome);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
