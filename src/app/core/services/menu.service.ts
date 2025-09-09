import { Injectable } from "@angular/core";
import { MenuItem } from "../models/menu-item.model";

// menu.service.ts
@Injectable({ providedIn: 'root' })
export class MenuService {
  getMenuItems(): MenuItem[] {
    return [];
  }
}
