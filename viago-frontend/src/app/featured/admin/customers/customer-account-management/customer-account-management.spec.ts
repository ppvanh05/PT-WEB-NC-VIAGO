import { TestBed } from '@angular/core/testing';
import { CustomerAccountManagement } from './customer-account-management';
import { AdminAccountsService } from '../../../../core/services/admin-accounts.service';
describe('Customer API saves', () => {
 it('waits for server confirmation and preserves edits after failure', async () => {
  const saveCustomer = vi.fn();
  await TestBed.configureTestingModule({imports:[CustomerAccountManagement],providers:[{provide:AdminAccountsService,useValue:{saveCustomer,customerOptions:async()=>({memberTiers:[]}),customers:async()=>[]}}]}).compileComponents();
  const fixture=TestBed.createComponent(CustomerAccountManagement),component=fixture.componentInstance;
  const original={code:'KH_TEST',name:'Original'};
  component.customers=[original];component.selectedCustomer={...original,name:'Edited'};component.showEditModal=true;
  let resolve!:(value:unknown)=>void;
  saveCustomer.mockReturnValueOnce(new Promise(r=>{resolve=r;}));
  const pending=component.saveCustomerChanges();
  expect(component.customers[0].name).toBe('Original');
  resolve({...original,name:'Edited'});await pending;
  expect(component.customers[0].name).toBe('Edited');expect(component.showEditModal).toBe(false);
  component.selectedCustomer={...original,name:'Retry'};component.showEditModal=true;
  saveCustomer.mockRejectedValueOnce(new Error('Server unavailable'));await component.saveCustomerChanges();
  expect(component.error).toBe('Server unavailable');expect(component.selectedCustomer.name).toBe('Retry');expect(component.showEditModal).toBe(true);expect(component.customers[0].name).toBe('Edited');
  fixture.destroy();
 });
});
