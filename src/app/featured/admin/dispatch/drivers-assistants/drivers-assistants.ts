import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface Personnel {
  id:number; name:string; role:'Tài xế'|'Phụ xe'; dob:string; phone:string; identityNumber?:string;
  licenseClass:string; licenseExpiry:string; status:'Đang làm việc'|'Nghỉ phép'|'Đã khóa';
  avatar?:string|null; licenseFrontImage?:string|null; licenseBackImage?:string|null;
  identityFrontImage?:string|null; identityBackImage?:string|null;
}
const assets = ['/assets/customer/chandungtaixe.jpg','/assets/customer/gplxmattruoc.jpg','/assets/customer/gplxmatsau.jpg','/assets/customer/cccdmattruoc.jpg','/assets/customer/cccdmatsau.jpg'];

@Component({selector:'app-drivers-assistants',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./drivers-assistants.html',styleUrls:['./drivers-assistants.css']})
export class DriversAssistants implements OnInit {
  activeTab:'Tất cả'|'Tài xế'|'Phụ xe'|'Đã khóa'='Tất cả'; searchQuery=''; roleFilter='Tất cả'; licenseFilter='Tất cả'; statusFilter='Tất cả';
  roleOptions=['Tất cả','Tài xế','Phụ xe']; licenseOptions=['Tất cả','B2','C','D','E']; statusOptions=['Tất cả','Đang làm việc','Nghỉ phép','Sắp hết hạn','Đã khóa'];
  isModalOpen=false; isSaving=false; isEditMode=false; lockTarget:Personnel|null=null; currentPersonnel:Partial<Personnel>={}; errors:Record<string,boolean>={};
  toasts:{id:number;message:string;type:'success'|'error'}[]=[]; toastCounter=0; currentPage=1; pageSize=10; totalPages=1;
  filteredPersonnel:Personnel[]=[]; paginatedPersonnel:Personnel[]=[];
  allPersonnel:Personnel[]=[
    {id:1,name:'Nguyễn Văn Minh',role:'Tài xế',dob:'15/03/1985',phone:'0901234567',licenseClass:'E',licenseExpiry:'20/08/2028',status:'Đang làm việc'},
    {id:2,name:'Trần Quốc Huy',role:'Tài xế',dob:'22/07/1988',phone:'0912345678',licenseClass:'E',licenseExpiry:'14/11/2027',status:'Đang làm việc'},
    {id:3,name:'Lê Hoàng Nam',role:'Tài xế',dob:'10/12/1983',phone:'0933456789',licenseClass:'E',licenseExpiry:'05/04/2029',status:'Nghỉ phép'},
    {id:4,name:'Phạm Đức Thành',role:'Tài xế',dob:'28/01/1990',phone:'0944567890',licenseClass:'D',licenseExpiry:'18/09/2028',status:'Đang làm việc'},
    {id:5,name:'Võ Thanh Tùng',role:'Tài xế',dob:'07/05/1987',phone:'0965678901',licenseClass:'D',licenseExpiry:'30/06/2027',status:'Đang làm việc'},
    {id:6,name:'Nguyễn Văn Phúc',role:'Phụ xe',dob:'12/09/1995',phone:'0976789012',licenseClass:'B2',licenseExpiry:'15/05/2028',status:'Đang làm việc'},
    {id:7,name:'Trần Minh Khang',role:'Phụ xe',dob:'25/11/1998',phone:'0987890123',licenseClass:'B2',licenseExpiry:'22/10/2027',status:'Đang làm việc'},
    {id:8,name:'Lê Quốc Bảo',role:'Phụ xe',dob:'18/02/1996',phone:'0398901234',licenseClass:'C',licenseExpiry:'09/03/2029',status:'Nghỉ phép'},
    {id:9,name:'Phan Gia Hưng',role:'Phụ xe',dob:'04/06/1999',phone:'0389012345',licenseClass:'B2',licenseExpiry:'28/12/2028',status:'Đang làm việc'},
    {id:10,name:'Đặng Nhật Quang',role:'Phụ xe',dob:'30/08/1997',phone:'0370123456',licenseClass:'C',licenseExpiry:'17/07/2027',status:'Đã khóa'}];
  constructor(private cdr:ChangeDetectorRef){}
  ngOnInit():void { this.allPersonnel=this.allPersonnel.map(p=>({...p,identityNumber:'079000000000',avatar:assets[0],licenseFrontImage:assets[1],licenseBackImage:assets[2],identityFrontImage:assets[3],identityBackImage:assets[4]})); this.filterPersonnel(); }
  getTotalCount(){return this.allPersonnel.length} getDriverCount(){return this.allPersonnel.filter(p=>p.role==='Tài xế'&&p.status!=='Đã khóa').length} getAssistantCount(){return this.allPersonnel.filter(p=>p.role==='Phụ xe'&&p.status!=='Đã khóa').length} getLockedCount(){return this.allPersonnel.filter(p=>p.status==='Đã khóa').length}
  setTab(t:'Tất cả'|'Tài xế'|'Phụ xe'|'Đã khóa'){this.activeTab=t;this.filterPersonnel()}
  filterPersonnel():void { this.filteredPersonnel=this.allPersonnel.filter(p=>{const tab=this.activeTab==='Tất cả'||(this.activeTab==='Đã khóa'?p.status==='Đã khóa':p.role===this.activeTab&&p.status!=='Đã khóa');const q=!this.searchQuery||[p.name,p.phone,p.identityNumber||''].join(' ').toLowerCase().includes(this.searchQuery.toLowerCase());const role=this.roleFilter==='Tất cả'||p.role===this.roleFilter;const lic=this.licenseFilter==='Tất cả'||p.licenseClass===this.licenseFilter;const stat=this.statusFilter==='Tất cả'||(this.statusFilter==='Sắp hết hạn'?this.isLicenseExpiringSoon(p):p.status===this.statusFilter);return tab&&q&&role&&lic&&stat});this.currentPage=1;this.updatePaginatedPersonnel() }
  updatePaginatedPersonnel(){this.totalPages=Math.max(1,Math.ceil(this.filteredPersonnel.length/this.pageSize));this.paginatedPersonnel=this.filteredPersonnel.slice((this.currentPage-1)*this.pageSize,this.currentPage*this.pageSize)}
  setPage(p:number|string){if(typeof p==='number'&&p>=1&&p<=this.totalPages){this.currentPage=p;this.updatePaginatedPersonnel()}} getPaginationItems(){return Array.from({length:this.totalPages},(_,i)=>i+1)}
  clearFilters(){this.searchQuery='';this.roleFilter=this.licenseFilter=this.statusFilter='Tất cả';this.filterPersonnel()} openAddModal(){this.isEditMode=false;this.errors={};this.currentPersonnel={status:'Đang làm việc',role:this.activeTab==='Phụ xe'?'Phụ xe':'Tài xế',licenseClass:''};this.isModalOpen=true}
  openEditModal(p:Personnel){this.isEditMode=true;this.errors={};this.currentPersonnel={...p,dob:this.toDateInput(p.dob),licenseExpiry:this.toDateInput(p.licenseExpiry)};this.isModalOpen=true} onPhoneInput(){this.currentPersonnel.phone=String(this.currentPersonnel.phone||'').replace(/\D/g,'').slice(0,10)} closeModal(){if(!this.isSaving)this.isModalOpen=false}
  async savePersonnel(){if(this.isSaving)return;this.errors={name:!String(this.currentPersonnel.name||'').trim(),dob:!this.currentPersonnel.dob,phone:!(/^\d{10}$/.test(String(this.currentPersonnel.phone||''))),identityNumber:!this.currentPersonnel.identityNumber,role:!this.currentPersonnel.role,licenseClass:!this.currentPersonnel.licenseClass,licenseExpiry:!this.currentPersonnel.licenseExpiry};if(Object.values(this.errors).some(Boolean)){this.addToast('Vui lòng nhập đầy đủ thông tin bắt buộc.','error');return}const p=this.currentPersonnel as Personnel;if(this.isEditMode){const i=this.allPersonnel.findIndex(x=>x.id===p.id);if(i>=0)this.allPersonnel[i]=p}else{p.id=Math.max(...this.allPersonnel.map(x=>x.id))+1;this.allPersonnel.push(p)}this.filterPersonnel();this.closeModal()}
  onImageUpload(e:Event,field:string){const f=(e.target as HTMLInputElement).files?.[0];if(!f)return;const r=new FileReader();r.onload=x=>(this.currentPersonnel as Record<string,unknown>)[field]=(x.target as FileReader).result;r.readAsDataURL(f);this.cdr.detectChanges()} removeImage(f:string){(this.currentPersonnel as Record<string,unknown>)[f]=null}
  isLicenseExpiringSoon(p:Personnel){const d=this.parseDate(p.licenseExpiry);return !!d&&p.status!=='Đã khóa'&&(d.getTime()-Date.now())/86400000<=30} getDisplayStatus(p:Personnel){return this.isLicenseExpiringSoon(p)?'Sắp hết hạn':p.status}
  toggleLock(p:Personnel){this.lockTarget=this.isSaving?null:p} confirmLock(){if(!this.lockTarget)return;const id=this.lockTarget.id;this.allPersonnel=this.allPersonnel.map(p=>p.id===id?{...p,status:p.status==='Đã khóa'?'Đang làm việc':'Đã khóa'}:p);this.lockTarget=null;this.filterPersonnel()}
  @HostListener('document:keydown.escape') onEscape(){if(this.lockTarget)this.lockTarget=null;else this.closeModal()} addToast(m:string,t:'success'|'error'){const id=this.toastCounter++;this.toasts.push({id,message:m,type:t});setTimeout(()=>this.removeToast(id),3000)} removeToast(id:number){this.toasts=this.toasts.filter(t=>t.id!==id)}
  private parseDate(v:string){const a=v.includes('-')?v.split('-').map(Number):v.split('/').reverse().map(Number);return a.length===3?new Date(a[0],a[1]-1,a[2]):null} private toDateInput(v:string){const d=this.parseDate(v);return d?d.toISOString().slice(0,10):v}
}
export { DriversAssistants as DriversAssistantsComponent };
