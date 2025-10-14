import { CommonModule } from '@angular/common';
import { Component, inject, model } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TPHHCreateDto, TPHHTableModel, TPHHUpdateDto, TPHHUpsertDto } from '../../../core/models/tphh.model';
import { ThanhPhanHoaHocService } from '../../../core/services/tphh.service';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { HttpResponseModel } from '../../../core/models/http-response.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatButtonModule,
    MatSelectModule,
    MatCardModule,
  ],
  templateUrl: './form-dialog.component.html',
  styleUrl: './form-dialog.component.scss',
})
export class FormDialogComponent {
  readonly dialogRef = inject(MatDialogRef<FormDialogComponent>);
  readonly data = inject<TPHHTableModel>(MAT_DIALOG_DATA);
  private tphhService = inject(ThanhPhanHoaHocService);
  private snack = inject(MatSnackBar);
  private notify = inject(NotificationService);

  public formTitle: string = 'Tạo mới';
  public form: FormGroup;
  submitted = false;

  constructor(private fb: FormBuilder) {
    if (this.data) {
      this.formTitle = 'Chỉnh sửa';
      this.tphhService
        .getById(this.data.id)
        .subscribe((res: TPHHTableModel) => {
          if(res){
            this.patchFormValue(res);
          }
        });
    }
    this.initForm();
  }

  cancel(result: boolean = false): void {
    this.dialogRef.close(result);
  }

  onSave() {
    this.submitted = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();  
      return;
    }
    const dto = this.getDto();
    const upsertPayload: TPHHUpsertDto = this.data
      ? { id: this.data.id, tp_HoaHoc: dto as TPHHCreateDto }
      : { id: null, tp_HoaHoc: dto as TPHHCreateDto };

    this.tphhService.upsert(upsertPayload).subscribe((res: HttpResponseModel<{ id: number }>) => {
      if (res?.success && res.statusCode >= 200 && res.statusCode < 300) {
        this.form.reset();
        this.cancel(true);
        this.notify[this.data ? 'info' : 'success'](this.data ? 'Đã cập nhật thành công' : 'Đã tạo mới thành công');
      } else {
        this.notify.error(res?.message || 'Thao tác thất bại');
      }
    });
  }

  initForm(id?: number) {
    this.form = this.fb.group({
      id: [id ?? null],
      ma_TPHH: [null, [Validators.required, Validators.minLength(1)]],
      ten_TPHH: [null, [Validators.required, Validators.minLength(1)]],
      ghi_Chu: [null],
    });
  }

  patchFormValue(tphh: TPHHTableModel){
    this.form.patchValue({
      id: tphh.id,
      ma_TPHH: tphh.ma_TPHH,
      ten_TPHH: tphh.ten_TPHH,
      ghi_Chu: tphh.ghi_Chu ?? null,
    });
  }

  fc = (name: string) => this.form.get(name)!;

  showError = (name: string) =>
    this.fc(name).invalid && (this.fc(name).touched || this.fc(name).dirty || this.submitted);
  hasError = (name: string, key: string) => this.fc(name).hasError(key);
  
  getDto(): TPHHCreateDto | TPHHUpdateDto {
    const base = {
      ten_TPHH: this.form.controls['ten_TPHH'].value,
      ma_TPHH: this.form.controls['ma_TPHH'].value,
      don_Vi: '%', // Mặc định là %
      thu_Tu: null, // Không cần thiết
      ghi_Chu: this.form.controls['ghi_Chu'].value,
    } as any;
    const id = this.form.controls['id'].value;
    return id ? ({ id, ...base } as TPHHUpdateDto) : (base as TPHHCreateDto);
  }
}
