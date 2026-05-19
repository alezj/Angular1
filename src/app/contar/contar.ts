import { Component,signal, computed  } from '@angular/core';

@Component({
  selector: 'app-contar',
  imports: [],
  templateUrl: './contar.html',
  styleUrl: './contar.css',
})
export class Contar {

  cantidad = signal(0);
  maxima = signal(0);
  isPositive = computed(() => this.cantidad() > 0);
  doubled = computed(() => this.cantidad() * 2);
    fnsumarUno () {
    this.cantidad.update (c => c +1 )
  } fnRestarUno(){
    this.cantidad.update (c => c - 1)
  }

}
