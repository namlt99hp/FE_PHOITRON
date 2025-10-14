import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Inject } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-name-plan-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './name-plan-dialog.component.html',
  styleUrl: './name-plan-dialog.component.scss',
})
export class NamePlanDialogComponent {
  private ref = inject(MatDialogRef<NamePlanDialogComponent, string | null>);
  public dialogData: { title?: string; initialName?: string } = inject(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    ten: [this.dialogData?.initialName || '', [Validators.required, Validators.maxLength(200)]],
  });

  onOk() {
    if (this.form.invalid) return;
    this.ref.close(this.form.controls.ten.value!);
  }

  get title(): string {
    return (this.dialogData && this.dialogData.title) ? this.dialogData.title! : 'Tạo phương án phối';
  }
}


