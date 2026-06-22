import { Component } from '@angular/core';
import { Floor3dComponent } from './components/floor-3d/floor-3d.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [Floor3dComponent],
  template: `
    <main class="page">
      <section class="hero">
        <div>
          <h1>3D Interactive Floor Dashboard POC</h1>
          <p>Explore the floor, click devices, drag them, and watch fake live statuses update.</p>
        </div>
      </section>

      <app-floor-3d />
    </main>
  `,
  styles: [`
    .page { min-height: 100vh; padding: 24px; }
    .hero { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    p { margin: 0; color: #cbd5e1; }
  `]
})
export class AppComponent {}
