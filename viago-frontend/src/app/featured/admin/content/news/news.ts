import { Component } from '@angular/core';
import { ContentManager } from '../content-manager/content-manager';
@Component({selector:'app-admin-news',standalone:true,imports:[ContentManager],templateUrl:'./news.html'})
export class News {}