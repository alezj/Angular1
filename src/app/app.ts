import { AppComponent} from './../app.component/app.component';
import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Pruebas } from "./pruebas/pruebas";
import { SearchComponent } from './search.component/search.component';
import { Custome } from './custome/custome';
import {Contar} from './contar/contar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Pruebas
    , SearchComponent , Custome, Contar],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Angular1');
}

