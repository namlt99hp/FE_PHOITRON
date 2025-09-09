export interface MenuItem {
  id: string;
  label: string;
  path?: string;            // có path => leaf
  icon?: string;            // tên Bootstrap Icon (không kèm 'bi-')
  roles?: string[];         // nếu bỏ trống => ai cũng thấy
  children?: MenuItem[];    // có children => folder
  section?: boolean;        // true => CHỈ là nhãn gom nhóm (không bấm)
}
export interface NavItem {
    displayName?: string;
    disabled?: boolean;
    external?: boolean;
    twoLines?: boolean;
    chip?: boolean;
    iconName?: string;
    navCap?: string;
    chipContent?: string;
    chipClass?: string;
    subtext?: string;
    route?: string;
    children?: NavItem[];
    ddType?: string;
}