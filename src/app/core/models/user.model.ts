export interface UserDto {
  id: number;
  fullName: string;
  email: string;
  role: string;        // ví dụ: 'Admin' | 'Manager' | 'User'
  createdAt: string;   // ISO 8601, ví dụ '2025-08-27T08:15:00Z'
  // optional:
  // phone?: string;
  // status?: 'Active' | 'Inactive';
  // department?: string;
}
