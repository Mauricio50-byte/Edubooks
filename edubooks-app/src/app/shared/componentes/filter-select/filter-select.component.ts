import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';

export interface SelectOption {
  value: string;
  label: string;
  icon?: string;
}

@Component({
  selector: 'app-filter-select',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
  templateUrl: './filter-select.component.html',
  styleUrls: ['./filter-select.component.scss']
})
export class FilterSelectComponent {
  @Input() label: string = '';
  @Input() placeholder: string = '';
  @Input() value: string | null = null;
  @Output() valueChange = new EventEmitter<string>();

  @Input() options: SelectOption[] = [];

  // Tipo de interfaz para ion-select (action-sheet por defecto)
  @Input() interface: 'action-sheet' | 'popover' | 'alert' = 'action-sheet';

  onChange(event: any) {
    const val = event?.detail?.value ?? '';
    this.value = val;
    this.valueChange.emit(val);
  }
}