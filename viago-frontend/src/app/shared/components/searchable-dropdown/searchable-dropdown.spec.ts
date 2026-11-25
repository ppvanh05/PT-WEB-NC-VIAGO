import { TestBed } from '@angular/core/testing';
import { SearchableDropdownComponent } from './searchable-dropdown';

const cities = ['TP.HCM', 'Cần Thơ', 'Đà Lạt', 'Nha Trang'];
const routes = [
  { id: 'T1', name: 'TP.HCM - Cần Thơ' },
  { id: 'T2', name: 'TP.HCM - Đà Lạt' },
];

/** Dựng ô chọn có tìm kiếm; `items` nhận cả mảng chuỗi và mảng đối tượng. */
function build(items: unknown[] = cities, over: Record<string, unknown> = {}) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [SearchableDropdownComponent] });
  const fixture = TestBed.createComponent(SearchableDropdownComponent);
  const box = fixture.componentInstance;
  Object.assign(box, { items }, over);
  box.ngOnInit();
  const picked: unknown[] = [];
  const changed: unknown[] = [];
  box.selected.subscribe(value => picked.push(value));
  box.valueChange.subscribe(value => changed.push(value));
  return { box, fixture, picked, changed };
}

const key = (name: string) => {
  let prevented = false;
  return {
    event: { key: name, preventDefault: () => { prevented = true; } } as unknown as KeyboardEvent,
    wasPrevented: () => prevented,
  };
};

const click = () => {
  let stopped = false;
  return {
    event: { stopPropagation: () => { stopped = true; } } as unknown as MouseEvent,
    wasStopped: () => stopped,
  };
};

describe('Shared searchable dropdown', () => {
  it('reads the label and the value of plain items and of objects alike', () => {
    const { box } = build(routes, { bindLabel: 'name', bindValue: 'id' });
    expect(box.getItemLabel(routes[0])).toBe('TP.HCM - Cần Thơ');
    expect(box.getItemValue(routes[0])).toBe('T1');
    const plain = build().box;
    expect(plain.getItemLabel('Cần Thơ')).toBe('Cần Thơ');
    expect(plain.getItemValue('Cần Thơ')).toBe('Cần Thơ');
    expect(plain.getItemLabel(null)).toBe('');
    expect(plain.getItemValue(undefined)).toBeNull();
  });

  it('writes the label of the chosen value into the box', () => {
    const { box } = build(routes, { bindLabel: 'name', bindValue: 'id' });
    box.writeValue('T2');
    expect(box.searchText).toBe('TP.HCM - Đà Lạt');
    box.writeValue(null);
    expect(box.searchText).toBe('');
    // Giá trị không có trong danh sách thì hiện nguyên giá trị đó.
    box.writeValue('T9');
    expect(box.searchText).toBe('T9');
  });

  it('shows every item while nothing has been typed', () => {
    const { box } = build();
    expect(box.filteredItems).toEqual(cities);
    box.searchText = '';
    box.filterList();
    expect(box.filteredItems).toEqual(cities);
    const empty = build([]).box;
    expect(empty.filteredItems).toEqual([]);
  });

  it('searches without caring about accents, capitals or the letter d-stroke', () => {
    const { box } = build();
    const search = (text: string) => { box.searchText = text; box.filterList(); return box.filteredItems; };
    expect(search('can tho')).toEqual(['Cần Thơ']);
    expect(search('ĐÀ LẠT')).toEqual(['Đà Lạt']);
    expect(search('da lat')).toEqual(['Đà Lạt']);
    expect(search('trang')).toEqual(['Nha Trang']);
    expect(search('Hà Nội')).toEqual([]);
  });

  it('finds Ho Chi Minh City by the names people actually type', () => {
    const { box } = build();
    const search = (text: string) => { box.searchText = text; box.filterList(); return box.filteredItems; };
    expect(search('sai gon')).toEqual(['TP.HCM']);
    expect(search('saigon')).toEqual(['TP.HCM']);
    expect(search('hcm')).toEqual(['TP.HCM']);
    expect(search('sg')).toEqual(['TP.HCM']);
    expect(search('ho chi minh')).toEqual(['TP.HCM']);
  });

  it('opens on focus and reports it, unless the box is switched off', () => {
    const { box } = build();
    let opens = 0;
    box.opened.subscribe(() => opens++);
    box.onFocus();
    expect(box.isOpen).toBe(true);
    expect(opens).toBe(1);
    const off = build(cities, { disabled: true });
    off.box.onFocus();
    expect(off.box.isOpen).toBe(false);
  });

  it('forgets the chosen value as soon as the box is emptied by hand', () => {
    const { box, changed } = build();
    box.value = 'Cần Thơ';
    box.searchText = '';
    box.onInput();
    expect(box.value).toBeNull();
    expect(changed).toEqual([null]);
    expect(box.isOpen).toBe(true);
  });

  it('takes the only match when the customer presses Enter', () => {
    const { box, picked, changed } = build();
    box.searchText = 'can tho';
    box.filterList();
    const enter = key('Enter');
    box.onKeyDown(enter.event);
    expect(box.value).toBe('Cần Thơ');
    expect(box.searchText).toBe('Cần Thơ');
    expect(picked).toEqual(['Cần Thơ']);
    expect(changed).toEqual(['Cần Thơ']);
    expect(box.isOpen).toBe(false);
    expect(enter.wasPrevented()).toBe(true);
  });

  it('prefers the item typed in full over the first of the list', () => {
    const { box } = build(['Cần Thơ', 'Cần Thơ - Sóc Trăng']);
    box.searchText = 'cần thơ - sóc trăng';
    box.filterList();
    box.onKeyDown(key('Enter').event);
    expect(box.value).toBe('Cần Thơ - Sóc Trăng');
  });

  it('presses Enter on an empty box to clear the choice, and on no match to simply close', () => {
    const { box, changed } = build();
    box.value = 'Cần Thơ';
    box.searchText = '';
    box.isOpen = true;
    box.onKeyDown(key('Enter').event);
    expect(box.value).toBeNull();
    expect(box.isOpen).toBe(false);
    expect(changed.length).toBeGreaterThan(0);
    expect(changed.every(value => value === null)).toBe(true);
    const other = build();
    other.box.searchText = 'Hà Nội';
    other.box.filterList();
    other.box.isOpen = true;
    other.box.onKeyDown(key('Enter').event);
    expect(other.box.isOpen).toBe(false);
    expect(other.picked).toEqual([]);
  });

  it('closes on Escape and does nothing at all while switched off', () => {
    const { box } = build();
    box.isOpen = true;
    box.onKeyDown(key('Escape').event);
    expect(box.isOpen).toBe(false);
    const off = build(cities, { disabled: true });
    off.box.isOpen = true;
    off.box.searchText = 'can tho';
    off.box.onKeyDown(key('Enter').event);
    expect(off.box.isOpen).toBe(true);
    expect(off.picked).toEqual([]);
  });

  it('reports the item picked from the list and closes afterwards', () => {
    const { box, picked, changed } = build(routes, { bindLabel: 'name', bindValue: 'id' });
    box.isOpen = true;
    box.selectItem(routes[1]);
    expect(box.value).toBe('T2');
    expect(box.searchText).toBe('TP.HCM - Đà Lạt');
    expect(picked).toEqual([routes[1]]);
    expect(changed).toEqual(['T2']);
    expect(box.isOpen).toBe(false);
  });

  it('clears the box with the small cross without closing the list', () => {
    const { box, changed } = build();
    box.value = 'Cần Thơ';
    box.searchText = 'Cần Thơ';
    box.isOpen = true;
    const cross = click();
    box.clearValue(cross.event);
    expect(cross.wasStopped()).toBe(true);
    expect(box.searchText).toBe('');
    expect(box.value).toBeNull();
    expect(changed).toEqual([null]);
    expect(box.isOpen).toBe(true);
    expect(box.filteredItems).toEqual(cities);
  });

  it('opens and closes again on the arrow, and stays shut while switched off', () => {
    const { box } = build();
    let opens = 0, closes = 0;
    box.opened.subscribe(() => opens++);
    box.closed.subscribe(() => closes++);
    box.toggleDropdown(click().event);
    expect(box.isOpen).toBe(true);
    box.toggleDropdown(click().event);
    expect(box.isOpen).toBe(false);
    expect([opens, closes]).toEqual([1, 1]);
    const off = build(cities, { disabled: true });
    off.box.toggleDropdown(click().event);
    expect(off.box.isOpen).toBe(false);
  });

  it('keeps a name typed in full when the list is closed by clicking away', () => {
    const { box, picked } = build();
    box.isOpen = true;
    box.searchText = 'can tho';
    box.closeDropdown();
    expect(box.value).toBe('Cần Thơ');
    expect(box.searchText).toBe('Cần Thơ');
    expect(picked).toEqual(['Cần Thơ']);
  });

  it('puts back the previous choice when what was typed matches nothing', () => {
    const { box } = build();
    box.writeValue('Cần Thơ');
    box.isOpen = true;
    box.searchText = 'Hà N';
    box.closeDropdown();
    expect(box.value).toBe('Cần Thơ');
    expect(box.searchText).toBe('Cần Thơ');
  });

  it('accepts a nickname of Ho Chi Minh City when the list is closed', () => {
    const { box } = build();
    box.isOpen = true;
    box.searchText = 'sai gon';
    box.closeDropdown();
    expect(box.value).toBe('TP.HCM');
    expect(box.searchText).toBe('TP.HCM');
  });

  it('closes when the customer clicks anywhere outside the box', () => {
    const { box, fixture } = build();
    box.isOpen = true;
    box.searchText = 'Cần Thơ';
    box.value = 'Cần Thơ';
    box.onClickOutside({ target: document.body } as unknown as MouseEvent);
    expect(box.isOpen).toBe(false);
    box.isOpen = true;
    // Bấm vào chính ô chọn thì không đóng.
    box.onClickOutside({ target: fixture.nativeElement } as unknown as MouseEvent);
    expect(box.isOpen).toBe(true);
  });

  it('tells the form it has been touched once the list closes', () => {
    const { box } = build();
    let touched = 0;
    let written: unknown = 'chưa';
    box.registerOnTouched(() => touched++);
    box.registerOnChange(value => { written = value; });
    box.isOpen = true;
    box.closeDropdown();
    expect(touched).toBe(1);
    expect(written).toBeNull();
    box.setDisabledState(true);
    expect(box.disabled).toBe(true);
  });

  it('refreshes the box and the list when the items or the value are replaced', () => {
    const { box } = build(routes, { bindLabel: 'name', bindValue: 'id' });
    box.value = 'T2';
    box.ngOnChanges({ value: { currentValue: 'T2', previousValue: 'T1', firstChange: false, isFirstChange: () => false } });
    expect(box.searchText).toBe('TP.HCM - Đà Lạt');
    box.items = [{ id: 'T3', name: 'TP.HCM - Nha Trang' }];
    box.searchText = '';
    box.ngOnChanges({ items: { currentValue: box.items, previousValue: routes, firstChange: false, isFirstChange: () => false } });
    expect(box.filteredItems).toEqual(box.items);
  });
});
