import { Component, signal } from '@angular/core';
import { SketchCanvas } from './sketch/sketch-canvas/sketch-canvas';

@Component({
  imports: [SketchCanvas],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('diplomski');
}
