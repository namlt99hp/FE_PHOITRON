import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { MatTreeModule } from '@angular/material/tree';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { MenuItem } from '../../../core/models/menu-item.model';
import { RouterModule } from '@angular/router';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MaterialModule } from '../../../material.module';
import { BrandingComponent } from '../branding/branding.component';
import { NgScrollbarModule } from 'ngx-scrollbar';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTreeModule,
    MatButtonModule,
    MatIconModule,
    RouterModule,
    BrandingComponent, 
    TablerIconsModule, 
    MaterialModule, 
    NgScrollbarModule
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {

  @Input() showToggle = true;
  @Output() toggleMobileNav = new EventEmitter<void>();
  @Output() toggleCollapsed = new EventEmitter<void>();

  @Input() menuItems: MenuItem[] = [];
  @Input() userRoles: string[] = [];
  @Input() isCollapsed = true; // true = mở, false = gập 60px

  /** id -> mở/đóng cho folder (chỉ áp dụng folder, không áp dụng section) */
  openStates: Record<string, boolean> = {};

  /** dữ liệu đã lọc theo role + “đóng dấu” id full-path để unique */
  filtered: MenuItem[] = [];

  ngOnChanges(ch: SimpleChanges): void {
    if (ch['menuItems'] || ch['userRoles']) {
      this.filtered = this.normalizeAndFilter(this.menuItems, this.userRoles, '');
    }
    // khi thu sidebar: đóng toàn bộ submenu
    if (ch['isCollapsed']?.previousValue === true && ch['isCollapsed']?.currentValue === false) {
      Object.keys(this.openStates).forEach(k => (this.openStates[k] = false));
    }
  }

  private normalizeAndFilter(items: MenuItem[], roles: string[], prefix: string): MenuItem[] {
    const canSee = (it: MenuItem) => !it.roles?.length || it.roles.some(r => roles.includes(r));
    return items
      .filter(canSee)
      .map(it => {
        const id = prefix ? `${prefix}/${it.id}` : it.id;
        const children = it.children ? this.normalizeAndFilter(it.children, roles, id) : undefined;
        return { ...it, id, children };
      })
      // giữ lại: section, leaf (có path), folder (còn con sau khi lọc)
      .filter(it => it.section || !!it.path || (it.children?.length ?? 0) > 0);
  }

  toggle(node: MenuItem) {
    if (!node.children?.length || node.section) return;
    this.openStates[node.id] = !this.openStates[node.id];
  }
  isOpen = (node: MenuItem) => !!this.openStates[node.id];
  hasChildren = (node: MenuItem) => !!node.children?.length && !node.section;
  trackById = (_: number, it: MenuItem) => it.id;

  
}
