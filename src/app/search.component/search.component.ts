import { Component,signal, computed } from '@angular/core';

@Component({
  selector: 'app-search',
  imports: [],
  standalone: true,
  templateUrl: './search.component.html',
  styleUrl: './search.component.css',
})
export class SearchComponent {

  // Signals
  items = signal(['Apple', 'Banana', 'Orange', 'Grapes']);
  searchTerm = signal('');

  // Computed signal
  filteredItems = computed(() => {
    const lowerCaseSearchTerm = this.searchTerm().toLowerCase();

    return this.items().filter(item =>
      item.toLowerCase().includes(lowerCaseSearchTerm)
    );
  });

}
