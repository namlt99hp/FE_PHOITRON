import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar } from '@angular/material/snack-bar';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { LoaiQuangService } from '../../../core/services/loai-quang.service';
import { LoaiQuangCreateDto, LoaiQuangTableModel, LoaiQuangUpdateDto, LoaiQuangUpsertDto } from '../../../core/models/loai-quang.model';
import { HttpResponseModel } from '../../../core/models/http-response.model';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-loai-quang-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
  ],
  templateUrl: './loai-quang-form-dialog.component.html',
  styleUrl: './loai-quang-form-dialog.component.scss',
})
export class LoaiQuangFormDialogComponent {
  readonly dialogRef = inject(MatDialogRef<LoaiQuangFormDialogComponent>);
  readonly data = inject<LoaiQuangTableModel | null>(MAT_DIALOG_DATA);
  private service = inject(LoaiQuangService);
  private notify = inject(NotificationService);
  private snack = inject(MatSnackBar);

  formTitle = 'Tạo mới loại quặng';
  form: FormGroup;
  submitted = false;

  constructor(private fb: FormBuilder) {
    this.initForm();

    if (this.data) {
      this.formTitle = 'Chỉnh sửa loại quặng';
      this.service.getById(this.data.id).subscribe((res) => {
        if (res) {
          this.patchFormValue(res);
        }
      });
    }
  }

  private initForm() {
    this.form = this.fb.group({
      id: [null],
      maLoaiQuang: [null, [Validators.required, Validators.minLength(1)]],
      tenLoaiQuang: [null, [Validators.required, Validators.minLength(1)]],
      moTa: [null],
      isActive: [true],
    });

    // Tự động tạo slug cho mã loại quặng khi người dùng nhập tên loại
    this.form
      .get('tenLoaiQuang')!
      .valueChanges.pipe(debounceTime(100), distinctUntilChanged())
      .subscribe((value: string | null) => {
        const slug = this.toSlugNoDash(value ?? '');
        this.form.get('maLoaiQuang')!.setValue(slug, { emitEvent: false });
      });
  }

  // Chuyển chuỗi tiếng Việt sang slug không dấu, không khoảng trắng, dùng cho mã
  private toSlugNoDash(input: string): string {
    if (!input) return '';
    let str = input
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // bỏ dấu
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-') // thay chuỗi không phải chữ/số bằng dấu '-'
      .replace(/^-+|-+$/g, ''); // bỏ '-' ở đầu/cuối

    // Bỏ hết dấu '-' để mã liền mạch (hoặc giữ '-' nếu bạn muốn)
    // str = str.replace(/-/g, '');
    return str;
  }

  private patchFormValue(item: LoaiQuangTableModel) {
    this.form.patchValue({
      id: item.id,
      maLoaiQuang: item.maLoaiQuang,
      tenLoaiQuang: item.tenLoaiQuang,
      moTa: item.moTa ?? null,
      isActive: item.isActive,
    });
  }

  fc = (name: string) => this.form.get(name)!;

  showError = (name: string) =>
    this.fc(name).invalid && (this.fc(name).touched || this.fc(name).dirty || this.submitted);

  hasError = (name: string, key: string) => this.fc(name).hasError(key);

  cancel(result: boolean = false): void {
    this.dialogRef.close(result);
  }

  onSave(): void {
    this.submitted = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const dto = this.getDto();
    const upsertPayload: LoaiQuangUpsertDto = this.form.value.id
      ? { id: this.form.value.id, loaiQuang: dto as LoaiQuangCreateDto }
      : { id: null, loaiQuang: dto as LoaiQuangCreateDto };

    this.service.upsert(upsertPayload).subscribe((res: HttpResponseModel<{ id: number }>) => {
      if (res?.success && res.statusCode >= 200 && res.statusCode < 300) {
        this.form.reset({ isActive: true });
        this.cancel(true);
        this.notify[this.data ? 'info' : 'success'](
          this.data ? 'Đã cập nhật loại quặng' : 'Đã tạo mới loại quặng'
        );
      } else {
        this.notify.error(res?.message || 'Thao tác thất bại');
      }
    });
  }

  private getDto(): LoaiQuangCreateDto | LoaiQuangUpdateDto {
    const base: LoaiQuangCreateDto = {
      maLoaiQuang: this.form.controls['maLoaiQuang'].value,
      tenLoaiQuang: this.form.controls['tenLoaiQuang'].value,
      moTa: this.form.controls['moTa'].value,
      isActive: this.form.controls['isActive'].value,
    };
    const id = this.form.controls['id'].value;
    return id ? ({ id, ...base } as LoaiQuangUpdateDto) : base;
  }
}

