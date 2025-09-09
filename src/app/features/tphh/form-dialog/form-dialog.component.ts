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
import { TPHHDto, TPHHTableModel } from '../../../core/models/tphh.model';
import { ThanhPhanHoaHocService } from '../../../core/services/tphh.service';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { HttpResponseModel } from '../../../core/models/http-response.model';
import { MatSnackBar } from '@angular/material/snack-bar';

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

  public formTitle: string = 'Tạo mới';
  public form: FormGroup;
  submitted = false;

  constructor(private fb: FormBuilder) {
    if (this.data) {
      this.formTitle = 'Chỉnh sửa';
      this.tphhService
        .getDetail(this.data.id)
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
    if(this.data){
      this.tphhService.update(dto).subscribe((res: HttpResponseModel) => {
        if(res.success){
            this.form.reset();
            this.cancel(true);
            this.snack.open('Đã cập nhật thành công', 'OK', { duration: 1500, panelClass: ['snack-info']})
          }
      });
    } else{

      this.tphhService.create(dto).subscribe((res: any) => {
        if(res){
            this.form.reset();
            this.cancel(true);
            this.snack.open('Đã tạo mới thành công', 'OK', { duration: 1500, panelClass: ['snack-success'] })
          }
      });
    }
  }

  initForm(id?: number) {
    this.form = this.fb.group({
      id: [id ?? null],
      ma_TPHH: [null, [Validators.required, Validators.minLength(1)]],
      ten_TPHH: [null, [Validators.required, Validators.minLength(1)]],
      ghiChu: [null],
    });
  }

  patchFormValue(tphh: TPHHTableModel){
    this.form.patchValue(tphh)
  }

  fc = (name: string) => this.form.get(name)!;

  showError = (name: string) =>
    this.fc(name).invalid && (this.fc(name).touched || this.fc(name).dirty || this.submitted);
  hasError = (name: string, key: string) => this.fc(name).hasError(key);
  
  getDto() {
    let dto: TPHHDto = {
      id: this.form.controls['id'].value,
      ten_TPHH: this.form.controls['ten_TPHH'].value,
      ma_TPHH: this.form.controls['ma_TPHH'].value,
      ghiChu: this.form.controls['ghiChu'].value,
    };
    return dto;
  }
}
