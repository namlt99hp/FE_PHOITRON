import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MaterialModule } from '../../material.module';

@Component({
  selector: 'app-quan-tri-nhan-su',
  standalone: true,
  imports: [CommonModule, RouterOutlet, MaterialModule],
  templateUrl: './quan-tri-nhan-su.component.html',
  styleUrl: './quan-tri-nhan-su.component.scss'
})
export class QuanTriNhanSuComponent implements OnInit {
  constructor() { }

  ngOnInit(): void {
  }
}

