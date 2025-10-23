import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ChemItem {
  id: number;
  name: string;
  value: number;
}

@Component({
  selector: 'app-chem-selection-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatListModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './chem-selection-dialog.component.html',
  styleUrls: ['./chem-selection-dialog.component.scss']
})
export class ChemSelectionDialogComponent {
  selectedChems: ChemItem[] = [];

  constructor(
    public dialogRef: MatDialogRef<ChemSelectionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { chems: ChemItem[], rowName: string }
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    this.dialogRef.close(this.selectedChems);
  }

  toggleChem(chem: ChemItem): void {
    const index = this.selectedChems.findIndex(c => c.id === chem.id);
    if (index > -1) {
      this.selectedChems.splice(index, 1);
    } else {
      this.selectedChems.push(chem);
    }
  }

  isSelected(chem: ChemItem): boolean {
    return this.selectedChems.some(c => c.id === chem.id);
  }

  getSelectedCount(): number {
    return this.selectedChems.length;
  }
}



