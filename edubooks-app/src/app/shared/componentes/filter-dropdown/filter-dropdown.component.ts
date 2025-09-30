import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';

export interface FilterOption {
  value: string;
  label: string;
  icon?: string;
  color?: string;
}

@Component({
  selector: 'app-filter-dropdown',
  templateUrl: './filter-dropdown.component.html',
  styleUrls: ['./filter-dropdown.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule]
})
export class FilterDropdownComponent implements OnInit {
  @Input() title: string = 'Filtros';
  @Input() options: FilterOption[] = [];
  @Input() selectedValue: string | string[] = '';
  @Input() placeholder: string = 'Seleccionar...';
  @Input() icon: string = 'filter-outline';
  @Input() color: string = 'primary';
  @Input() multiple: boolean = false;
  @Input() clearable: boolean = true;

  @Output() selectedValueChange = new EventEmitter<string | string[]>();
  @Output() selectionChange = new EventEmitter<string | string[]>();
  @Output() clear = new EventEmitter<void>();

  isOpen = false;
  selectedValues: string[] = [];

  ngOnInit() {
    if (this.multiple && this.selectedValue) {
      this.selectedValues = Array.isArray(this.selectedValue) 
        ? this.selectedValue 
        : [this.selectedValue];
    }
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  selectOption(value: string) {
    if (this.multiple) {
      const index = this.selectedValues.indexOf(value);
      if (index > -1) {
        this.selectedValues.splice(index, 1);
      } else {
        this.selectedValues.push(value);
      }
      this.selectedValue = [...this.selectedValues];
      this.selectedValueChange.emit([...this.selectedValues]);
      this.selectionChange.emit([...this.selectedValues]);
    } else {
      this.selectedValue = value;
      this.selectedValueChange.emit(value);
      this.selectionChange.emit(value);
      this.isOpen = false;
    }
  }

  clearSelection() {
    if (this.multiple) {
      this.selectedValues = [];
      this.selectedValue = [];
      this.selectedValueChange.emit([]);
      this.selectionChange.emit([]);
    } else {
      this.selectedValue = '';
      this.selectedValueChange.emit('');
      this.selectionChange.emit('');
    }
    this.clear.emit();
    this.isOpen = false;
  }

  isSelected(value: string): boolean {
    if (this.multiple) {
      return this.selectedValues.includes(value);
    }
    return this.selectedValue === value;
  }

  getSelectedLabel(): string {
    if (this.multiple) {
      if (this.selectedValues.length === 0) return this.placeholder;
      if (this.selectedValues.length === 1) {
        const option = this.options.find(opt => opt.value === this.selectedValues[0]);
        return option?.label || this.selectedValues[0];
      }
      return `${this.selectedValues.length} seleccionados`;
    } else {
      if (!this.selectedValue) return this.placeholder;
      const option = this.options.find(opt => opt.value === this.selectedValue as string);
      return option?.label || this.selectedValue as string;
    }
  }

  getSelectedCount(): number {
    return this.multiple ? this.selectedValues.length : (this.selectedValue ? 1 : 0);
  }
}