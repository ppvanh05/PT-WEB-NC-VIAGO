Cấu trúc thư mục dự án
1. Ban đầu
```text
src/app
├── auth
│   ├── auth-modal
│   └── security-settings-modal
│
├── core
│   ├── layout
│   │   ├── admin-layout
│   │   ├── sidebar
│   │   └── topbar
│   ├── services
│   └── utils
│
├── shared
│   ├── components
│   │   ├── lunar-date-picker
│   │   ├── searchable-dropdown
│   │   └── voucher-card
│   └── toast.service.ts
│
└── featured
    ├── admin
    │   ├── auth
    │   ├── bao-cao
    │   ├── bo-cuc
    │   ├── dat-ve
    │   ├── dieu-phoi
    │   ├── khach-hang
    │   ├── nhan-vien
    │   ├── nhat-ky
    │   ├── noi-dung
    │   ├── thue-xe-hop-dong
    │   └── trangchu
    │
    └── customer
        ├── about
        │   ├── about-us
        │   ├── careers
        │   ├── contact
        │   ├── faq
        │   ├── guide
        │   ├── policies
        │   └── terms
        ├── ChatBot
        ├── customer-layout
        ├── home
        ├── invoice
        ├── news
        ├── profile
        ├── reviews
        ├── schedule
        ├── services
        └── ticket-lookup
```
---
2. Bản sau
```text
src/app
├── auth
│   ├── auth-modal
│   └── security-settings-modal
│
├── core
│   ├── layout
│   │   ├── admin-layout
│   │   ├── admin-sidebar
│   │   ├── admin-topbar
│   │   ├── customer-layout
│   │   ├── customer-navbar
│   │   └── customer-footer
│   │
│   ├── services
│   │   ├── voucher.service.ts
│   │   └── toast.service.ts
│   │
│   └── utils
│
├── shared
│   ├── components
│   │   ├── button
│   │   ├── input
│   │   ├── card
│   │   ├── badge
│   │   ├── toast
│   │   ├── pagination
│   │   ├── modal
│   │   ├── date-picker
│   │   ├── searchable-dropdown
│   │   └── voucher-card
│   │
│   └── utils
│       └── lunar-calendar.ts
│
└── featured
    ├── admin
    └── customer
```
---
3. Cấu trúc thư mục `public`
```text
public/
├── assets/
│   ├── brand/
│   ├── customer/
│   ├── admin/
│   ├── icons/
│   └── vehicles/
│
├── documents/
│   └── hoadondung.pdf
│
├── favicon.ico
└── sitemap.xml
```
Chức năng của các thư mục trong `assets`
Thư mục	Dùng cho
`brand/`	Nhận diện thương hiệu
`customer/`	Nội dung hình ảnh dành cho Customer
`admin/`	Nội dung hình ảnh dành cho Admin
`icons/`	Icon dùng chung trong hệ thống
`vehicles/`	Hình ảnh xe
