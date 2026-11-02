import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  HostListener,
  ViewChild,
  OnInit,
  OnChanges,
  SimpleChanges,
  forwardRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-searchable-dropdown',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './searchable-dropdown.html',
  styleUrl: './searchable-dropdown.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableDropdownComponent),
      multi: true
    }
  ]
})
export class SearchableDropdownComponent implements OnInit, OnChanges, ControlValueAccessor {
  @Input() label: string = '';
  @Input() placeholder: string = 'Chọn hoặc tìm kiếm...';
  @Input() items: any[] = [];
  @Input() bindLabel: string = '';
  @Input() bindValue: string = '';
  @Input() id: string = '';
  @Input() value: any = '';
  @Input() iconPath: string = '';
  @Input() disabled: boolean = false;
  @Input() emptyText: string = 'Không tìm thấy kết quả';

  @Output() valueChange = new EventEmitter<any>();
  @Output() selected = new EventEmitter<any>();
  @Output() opened = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  @ViewChild('inputEl') inputEl!: ElementRef<HTMLInputElement>;

  isOpen = false;
  searchText = '';
  filteredItems: any[] = [];

  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private elementRef: ElementRef) {}

  ngOnInit() {
    this.updateSearchText();
    this.filterList();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['value']) {
      this.updateSearchText();
    }
    if (changes['items'] || changes['value']) {
      this.filterList();
    }
  }

  // ControlValueAccessor Interface
  writeValue(value: any): void {
    this.value = value;
    this.updateSearchText();
    this.filterList();
  }

  registerOnChange(fn: (value: any) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  // Helpers to resolve label & value when items can be primitives or objects
  getItemLabel(item: any): string {
    if (item === null || item === undefined) return '';
    if (typeof item === 'object' && this.bindLabel) {
      return item[this.bindLabel] ?? '';
    }
    return String(item);
  }

  getItemValue(item: any): any {
    if (item === null || item === undefined) return null;
    if (typeof item === 'object' && this.bindValue) {
      return item[this.bindValue];
    }
    return item;
  }

  private updateSearchText() {
    if (this.value === null || this.value === undefined || this.value === '') {
      this.searchText = '';
      return;
    }

    if (this.items && this.items.length > 0) {
      const found = this.items.find(item => this.getItemValue(item) === this.value);
      if (found !== undefined) {
        this.searchText = this.getItemLabel(found);
        return;
      }
    }
    
    this.searchText = String(this.value);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeDropdown();
    }
  }

  onFocus() {
    if (this.disabled) return;
    this.isOpen = true;
    this.opened.emit();
    this.filterList();
  }

  onInput() {
    if (this.disabled) return;
    this.isOpen = true;
    if (!this.searchText) {
      this.setValue(null);
    }
    this.filterList();
  }

  onKeyDown(event: KeyboardEvent) {
    if (this.disabled) return;

    if (event.key === 'Enter') {
      if (!this.searchText) {
        this.setValue(null);
        this.closeDropdown();
      } else if (this.filteredItems.length > 0) {
        const exactMatch = this.filteredItems.find(
          item => this.normalizeStr(this.getItemLabel(item)) === this.normalizeStr(this.searchText)
        );
        if (exactMatch) {
          this.selectItem(exactMatch);
        } else {
          this.selectItem(this.filteredItems[0]);
        }
      } else {
        this.closeDropdown();
      }
      this.inputEl?.nativeElement?.blur();
      event.preventDefault();
    } else if (event.key === 'Escape') {
      this.closeDropdown();
      this.inputEl?.nativeElement?.blur();
    }
  }

  selectItem(item: any) {
    if (this.disabled) return;
    const val = this.getItemValue(item);
    const label = this.getItemLabel(item);
    this.value = val;
    this.searchText = label;
    this.setValue(val);
    this.selected.emit(item);
    this.closeDropdown();
    this.inputEl?.nativeElement?.blur();
  }

  clearValue(event: MouseEvent) {
    event.stopPropagation();
    if (this.disabled) return;
    this.searchText = '';
    this.setValue(null);
    this.filterList();
    if (this.isOpen) {
      this.inputEl?.nativeElement?.focus();
    }
  }

  toggleDropdown(event: MouseEvent) {
    event.stopPropagation();
    if (this.disabled) return;
    if (this.isOpen) {
      this.closeDropdown();
    } else {
      this.isOpen = true;
      this.opened.emit();
      this.inputEl?.nativeElement?.focus();
    }
  }

  closeDropdown() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.onTouched();
    this.closed.emit();

    if (!this.searchText) {
      this.setValue(null);
      return;
    }

    // Reset or match text if partially typed
    const currentValLabel = this.getSelectedLabel();
    if (this.searchText !== currentValLabel) {
      const match = this.items.find(item => {
        const label = this.getItemLabel(item);
        if (this.normalizeStr(label) === this.normalizeStr(this.searchText)) return true;
        if (label === 'TP.HCM') {
          const aliases = ['ho chi minh', 'sai gon', 'saigon', 'hcm', 'sg'];
          const normSearch = this.normalizeStr(this.searchText);
          return aliases.includes(normSearch) || aliases.some(alias => normSearch.includes(alias));
        }
        return false;
      });

      if (match) {
        this.selectItem(match);
      } else {
        this.searchText = currentValLabel;
      }
    }
  }

  private getSelectedLabel(): string {
    if (this.value === null || this.value === undefined) return '';
    const found = this.items.find(item => this.getItemValue(item) === this.value);
    return found ? this.getItemLabel(found) : '';
  }

  private setValue(val: any) {
    this.value = val;
    this.onChange(val);
    this.valueChange.emit(val);
  }

  filterList() {
    if (!this.items || this.items.length === 0) {
      this.filteredItems = [];
      return;
    }

    const currentValLabel = this.getSelectedLabel();
    if (!this.searchText || this.searchText === currentValLabel) {
      this.filteredItems = [...this.items];
      return;
    }

    const normSearchText = this.normalizeStr(this.searchText);
    this.filteredItems = this.items.filter(item => {
      const label = this.getItemLabel(item);
      const normItem = this.normalizeStr(label);
      if (normItem.includes(normSearchText)) return true;

      // Custom alias support for TP.HCM
      if (label === 'TP.HCM') {
        const aliases = ['ho chi minh', 'sai gon', 'saigon', 'hcm', 'sg'];
        return aliases.some(alias => alias.includes(normSearchText) || normSearchText.includes(alias));
      }
      return false;
    });
  }

  private normalizeStr(str: string): string {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .trim();
  }
}

export { SearchableDropdownComponent as SearchableDropdown };
