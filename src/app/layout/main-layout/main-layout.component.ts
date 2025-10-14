import { Component, OnDestroy, ViewChild } from '@angular/core';
import {
  RouterModule,
  RouterOutlet,
} from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MenuItem } from '../../core/models/menu-item.model';
import { FooterComponent } from '../components/footer/footer.component';
import { HeaderComponent } from '../components/header/header.component';
import { SidebarComponent } from '../components/sidebar/sidebar.component';
import { Subscription } from 'rxjs';
import { navItems } from './sidebar-data';
import { BreakpointObserver } from '@angular/cdk/layout';
import { NavService } from '../../core/services/nav.service';
import { NgScrollbarModule } from 'ngx-scrollbar';

const MOBILE_VIEW = 'screen and (max-width: 768px)';
const TABLET_VIEW = 'screen and (min-width: 769px) and (max-width: 1024px)';
const MONITOR_VIEW = 'screen and (min-width: 1024px)';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    FooterComponent,
    HeaderComponent,
    SidebarComponent,
    NgScrollbarModule,
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent implements OnDestroy {
  userRoles: string[] = ['admin']; // hoặc lấy từ auth service
  MENU_ITEMS: MenuItem[] = [
    {
      id: 'sec-system',
      label: 'QUẢN TRỊ HỆ THỐNG',
      section: true,
      children: [
        {
          id: 'home',
          label: 'Trang chủ',
          path: '/home',
          icon: 'house',
          roles: ['admin', 'user'],
        },
        // {
        //   id: 'congthucphoi',
        //   label: 'Phương pháp phối trộn',
        //   path: '/phuong-phap-phoi-tron',
        //   icon: 'person',
        //   roles: ['admin'],
        // },
        {
          id: 'quang',
          label: 'Quặng',
          path: '/quang',
          icon: 'shield-lock',
          roles: ['admin'],
        },
        {
          id: 'tphh',
          label: 'Thành phần hóa học',
          path: '/thanh-phan-hoa-hoc',
          icon: 'clock-history',
          roles: ['admin'],
        },
        {
          id: 'quanggang',
          label: 'Quặng gang',
          path: '/quang-gang',
          icon: 'diagram-3',
          roles: ['admin'],
        },
        {
          id: 'org',
          label: 'Config chung',
          icon: 'buildings',
          children: [
            {
              id: 'dept',
              label: 'Lò cao items',
              path: '/locao-process-params',
              icon: 'hammer',
            },
            {
              id: 'dept',
              label: 'Thống kê phương án',
              path: '/thongke-phuongan',
              icon: 'hammer',
            },
            {
              id: 'shift',
              label: 'Phân quyền',
              path: '',
              icon: 'clock-history',
              children: [
                {
                  id: 'dept',
                  label: 'Phòng ban',
                  path: '/management/departments',
                  icon: 'diagram-3',
                },
                {
                  id: 'work',
                  label: 'Phân xưởng',
                  path: '/management/workshops',
                  icon: 'hammer',
                },
                {
                  id: 'title',
                  label: 'Chức vụ',
                  path: '/management/positions',
                  icon: 'person-badge',
                },
                {
                  id: 'shift',
                  label: 'Ca/Kíp làm việc',
                  path: '/management/shifts',
                  icon: 'clock-history',
                },
              ],
            },
          ],
        },

        // {
        //   id: 'assets',
        //   label: 'Thông tin vật tư',
        //   icon: 'boxes',
        //   children: [
        //     {
        //       id: 'catalog',
        //       label: 'Danh mục vật tư',
        //       path: '/assets/catalog',
        //       icon: 'collection',
        //     },
        //     {
        //       id: 'stock',
        //       label: 'Tồn kho',
        //       path: '/assets/stock',
        //       icon: 'archive',
        //     },
        //   ],
        // },
      ],
    },

    // {
    //   id: 'sec-workflow',
    //   label: 'QUY TRÌNH THỰC HIỆN',
    //   section: true,
    //   children: [
    //     {
    //       id: 'req',
    //       label: 'Tạo yêu cầu',
    //       path: '/requests/create',
    //       icon: 'envelope-plus',
    //       roles: ['admin', 'manager'],
    //     },
    //     {
    //       id: 'mywork',
    //       label: 'Việc tôi bắt đầu',
    //       icon: 'folder',
    //       children: [
    //         {
    //           id: 'draft',
    //           label: 'Bản nháp',
    //           path: '/tasks/draft',
    //           icon: 'file-earmark',
    //         },
    //         { id: 'sent', label: 'Đã gửi', path: '/tasks/sent', icon: 'send' },
    //       ],
    //     },
    //     {
    //       id: 'inbox',
    //       label: 'Việc đến tôi',
    //       icon: 'inbox',
    //       children: [
    //         {
    //           id: 'pending',
    //           label: 'Chờ xử lý',
    //           path: '/tasks/pending',
    //           icon: 'hourglass-split',
    //         },
    //         {
    //           id: 'done',
    //           label: 'Hoàn thành',
    //           path: '/tasks/done',
    //           icon: 'check2-circle',
    //         },
    //       ],
    //     },
    //   ],
    // },
  ];

  navItems = navItems;

  @ViewChild('leftsidenav')
  public sidenav: MatSidenav | any;

  //get options from service
  private layoutChangesSubscription = Subscription.EMPTY;
  private isMobileScreen = false;
  private isContentWidthFixed = true;
  private isCollapsedWidthFixed = false;
  private htmlElement!: HTMLHtmlElement;

  get isOver(): boolean {
    return this.isMobileScreen;
  }

  constructor(private breakpointObserver: BreakpointObserver, private navService: NavService) {
    
    this.htmlElement = document.querySelector('html')!;
    this.htmlElement.classList.add('light-theme');
    this.layoutChangesSubscription = this.breakpointObserver
      .observe([MOBILE_VIEW, TABLET_VIEW, MONITOR_VIEW])
      .subscribe((state) => {
        // SidenavOpened must be reset true when layout changes

        this.isMobileScreen = state.breakpoints[MOBILE_VIEW];

        this.isContentWidthFixed = state.breakpoints[MONITOR_VIEW];
      });
  }

  ngOnInit(): void {}

  ngOnDestroy() {
    this.layoutChangesSubscription.unsubscribe();
  }

  toggleCollapsed() {
    this.isContentWidthFixed = false;
  }

  onSidenavClosedStart() {
    this.isContentWidthFixed = false;
  }

  onSidenavOpenedChange(isOpened: boolean) {
    this.isCollapsedWidthFixed = !this.isOver;
  }
}
