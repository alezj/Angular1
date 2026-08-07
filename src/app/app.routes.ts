import { DatosService } from './datos';
import { Routes } from '@angular/router';
import { Pruebas } from './pruebas/pruebas';
import { SearchComponent } from './search.component/search.component';
import { Custome } from './custome/custome';
import { Contar } from './contar/contar';
import  {Datos } from './datos/datos';
import { Inquilinos } from './inquilinos/inquilinos';

export const routes: Routes = [
  { path: '', redirectTo: 'pruebas', pathMatch: 'full' },
  { path: 'pruebas', component: Pruebas },
  { path: 'search', component: SearchComponent },
  { path: 'custom', component: Custome },
  { path: 'contar', component: Contar },
  { path: 'datos', component: Datos },
  { path: 'inquilinos', component: Inquilinos }
];

