import { NavItem } from "../../core/models/menu-item.model";

export const navItems: NavItem[] = [
  {
    navCap: 'Trang chủ',
  },
  {
    displayName: 'Dashboard',
    iconName: 'layout-grid-add',
    route: '/home',
  },
  {
    navCap: 'Quản lý',
  },
  {
    displayName: 'Phương pháp phối trộn',
    iconName: 'archive',
    route: '/cong-thuc-phoi',
  },
  {
    displayName: 'Quặng',
    iconName: 'file-text-ai',
    route: '/quang',
  },
  {
    displayName: 'Thành phần hóa học',
    iconName: 'list-details',
    route: '/thanh-phan-hoa-hoc',
  },
  // {
  //   displayName: 'Menu',
  //   iconName: 'file-text',
  //   route: '/ui-components/menu',
  // },
  // {
  //   displayName: 'Tooltips',
  //   iconName: 'file-text-ai',
  //   route: '/ui-components/tooltips',
  // },
  // {
  //   displayName: 'Forms',
  //   iconName: 'clipboard-text',
  //   route: '/ui-components/forms',
  // },
  // {
  //   displayName: 'Tables',
  //   iconName: 'table',
  //   route: '/ui-components/tables',
  // },
  {
    navCap: 'Auth',
  },
  {
    displayName: 'Login',
    iconName: 'login',
    route: '/authentication/login',
  },
  {
    displayName: 'Register',
    iconName: 'user-plus',
    route: '/authentication/register',
  },
  // {
  //   navCap: 'Extra',
  // },
  // {
  //   displayName: 'Icons',
  //   iconName: 'mood-smile',
  //   route: '/extra/icons',
  // },
  // {
  //   displayName: 'Sample Page',
  //   iconName: 'brand-dribbble',
  //   route: '/extra/sample-page',
  // },
];
