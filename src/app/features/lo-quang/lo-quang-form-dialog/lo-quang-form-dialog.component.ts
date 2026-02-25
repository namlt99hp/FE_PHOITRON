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

import { LoQuangService } from '../../../core/services/loai-quang.service';
import { LoQuangCreateDto, LoQuangTableModel, LoQuangUpdateDto, LoQuangUpsertDto } from '../../../core/models/loai-quang.model';
import { HttpResponseModel } from '../../../core/models/http-response.model';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-lo-quang-form-dialog',
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
  templateUrl: './lo-quang-form-dialog.component.html',
  styleUrl: './lo-quang-form-dialog.component.scss',
})
export class LoQuangFormDialogComponent {
  readonly dialogRef = inject(MatDialogRef<LoQuangFormDialogComponent>);
  readonly data = inject<LoQuangTableModel | null>(MAT_DIALOG_DATA);
  private service = inject(LoQuangService);
  private notify = inject(NotificationService);
  private snack = inject(MatSnackBar);

  formTitle = 'Tạo mới lô quặng';
  form: FormGroup;
  submitted = false;

  constructor(private fb: FormBuilder) {
    this.initForm();

    if (this.data) {
      this.formTitle = 'Chỉnh sửa lô quặng';
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
      maLoQuang: [null, [Validators.required, Validators.minLength(1)]],
      moTa: [null],
      isActive: [true],
    });
  }

  private patchFormValue(item: LoQuangTableModel) {
    this.form.patchValue({
      id: item.id,
      maLoQuang: item.maLoQuang,
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
    const upsertPayload: LoQuangUpsertDto = this.form.value.id
      ? { id: this.form.value.id, loQuang: dto as LoQuangCreateDto }
      : { id: null, loQuang: dto as LoQuangCreateDto };

    this.service.upsert(upsertPayload).subscribe((res: HttpResponseModel<{ id: number }>) => {
      if (res?.success && res.statusCode >= 200 && res.statusCode < 300) {
        this.form.reset({ isActive: true });
        this.cancel(true);
        this.notify[this.data ? 'info' : 'success'](
          this.data ? 'Đã cập nhật lô quặng' : 'Đã tạo mới lô quặng'
        );
      } else {
        this.notify.error(res?.message || 'Thao tác thất bại');
      }
    });
  }

  private getDto(): LoQuangCreateDto | LoQuangUpdateDto {
    const base: LoQuangCreateDto = {
      maLoQuang: this.form.controls['maLoQuang'].value,
      moTa: this.form.controls['moTa'].value,
      isActive: this.form.controls['isActive'].value,
    };
    const id = this.form.controls['id'].value;
    return id ? ({ id, ...base } as LoQuangUpdateDto) : base;
  }
}

