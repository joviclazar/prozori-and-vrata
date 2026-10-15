import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SketchCanvas } from './sketch-canvas';

describe('SketchCanvas', () => {
  let component: SketchCanvas;
  let fixture: ComponentFixture<SketchCanvas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SketchCanvas],
    }).compileComponents();

    fixture = TestBed.createComponent(SketchCanvas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
